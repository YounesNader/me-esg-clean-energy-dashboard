"""
backend/routers/data_router.py
--------------------------------
/api/data  — endpoints that serve the cleaned ESG dataset.

All endpoints read from request.app.state.df (loaded at startup) so
there are zero disk reads at request time.  Filtering, aggregation,
and serialisation happen in-memory with pandas, then converted to
plain Python types before Pydantic validates the response shape.
"""

from __future__ import annotations

from typing import Literal

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Request

from backend.schemas import (
    CountriesResponse,
    CountrySummary,
    HeatmapResponse,
    OverviewResponse,
    SectorBreakdown,
    SectorResponse,
    TimeseriesPoint,
    TimeseriesResponse,
)

router = APIRouter()

# Metric name → DataFrame column mapping used by /timeseries
METRIC_MAP: dict[str, str] = {
    "esg_budget":           "esg_budget_usd_million",
    "renewable_investment": "renewable_energy_investment_usd_million",
    "esg_score":            "esg_score",
    "carbon_emissions":     "carbon_emissions_mt",
    "green_bonds":          "green_bonds_issued_usd_million",
}

# Columns included in the correlation heatmap
CORR_COLS = [
    "esg_budget_usd_million",
    "renewable_energy_investment_usd_million",
    "solar_capacity_mw",
    "wind_capacity_mw",
    "carbon_emissions_mt",
    "esg_score",
    "gdp_usd_billion",
    "oil_revenue_usd_billion",
    "policy_index",
    "green_bonds_issued_usd_million",
    "esg_budget_per_gdp",
    "investment_efficiency",
]

# Friendly short labels for correlation matrix columns (same order as CORR_COLS)
CORR_LABELS = [
    "ESG Budget",
    "RE Investment",
    "Solar Capacity",
    "Wind Capacity",
    "CO2 Emissions",
    "ESG Score",
    "GDP",
    "Oil Revenue",
    "Policy Index",
    "Green Bonds",
    "Budget/GDP %",
    "Invest. Efficiency",
]


def _validate_country(country: str | None, available: list[str]) -> None:
    """Raise 404 if a requested country is not in the dataset."""
    if country and country not in available:
        raise HTTPException(
            status_code=404,
            detail=f"Country '{country}' not found. Available: {available}",
        )


# ── GET /api/data/countries ───────────────────────────────────────────────────
@router.get(
    "/countries",
    response_model=CountriesResponse,
    summary="List all countries",
)
async def get_countries(request: Request) -> CountriesResponse:
    """
    Returns the full list of countries available in the dataset.
    Use this to populate dropdown menus and map filters in the frontend.
    """
    countries = request.app.state.countries
    return CountriesResponse(countries=countries, count=len(countries))


# ── GET /api/data/overview ────────────────────────────────────────────────────
@router.get(
    "/overview",
    response_model=OverviewResponse,
    summary="Dataset overview with per-country and sector summaries",
)
async def get_overview(
    request: Request,
    country: str | None = Query(None, description="Filter to a single country"),
) -> OverviewResponse:
    """
    Returns high-level aggregates useful for the dashboard KPI strip:
    - Total ESG budget and RE investment per country
    - Average ESG score and policy index per country
    - Investment split by clean-energy sector

    Optionally filtered to a single country via `?country=UAE`.
    """
    df: pd.DataFrame = request.app.state.df.copy()
    _validate_country(country, request.app.state.countries)

    if country:
        df = df[df["country"] == country]

    # ── Per-country aggregates ────────────────────────────────────────────────
    grp = df.groupby("country", sort=True)
    summaries: list[CountrySummary] = []
    for cname, cdf in grp:
        summaries.append(
            CountrySummary(
                country=str(cname),
                total_esg_budget_usd_million=round(float(cdf["esg_budget_usd_million"].sum()), 2),
                total_re_investment_usd_million=round(
                    float(cdf["renewable_energy_investment_usd_million"].sum()), 2
                ),
                avg_esg_score=round(float(cdf["esg_score"].mean()), 2),
                avg_policy_index=round(float(cdf["policy_index"].mean()), 2),
                latest_year=int(cdf["year"].max()),
                earliest_year=int(cdf["year"].min()),
            )
        )

    # Sort by total ESG budget descending (most invested first)
    summaries.sort(key=lambda s: s.total_esg_budget_usd_million, reverse=True)

    # ── Sector breakdown ──────────────────────────────────────────────────────
    sector_grp = (
        df.groupby("sector")
        .agg(
            total_re_investment_usd_million=("renewable_energy_investment_usd_million", "sum"),
            country_count=("country", "nunique"),
        )
        .reset_index()
        .sort_values("total_re_investment_usd_million", ascending=False)
    )
    sectors: list[SectorBreakdown] = [
        SectorBreakdown(
            sector=str(row["sector"]),
            total_re_investment_usd_million=round(float(row["total_re_investment_usd_million"]), 2),
            country_count=int(row["country_count"]),
        )
        for _, row in sector_grp.iterrows()
    ]

    return OverviewResponse(
        date_range=[int(df["year"].min()), int(df["year"].max())],
        filtered_country=country,
        country_summaries=summaries,
        sector_breakdown=sectors,
        total_countries=int(df["country"].nunique()),
    )


# ── GET /api/data/timeseries ──────────────────────────────────────────────────
@router.get(
    "/timeseries",
    response_model=TimeseriesResponse,
    summary="Year-by-year metric time series",
)
async def get_timeseries(
    request: Request,
    country: str | None = Query(None, description="Filter to a single country (omit for all)"),
    metric: Literal[
        "esg_budget", "renewable_investment", "esg_score",
        "carbon_emissions", "green_bonds"
    ] = Query("esg_budget", description="Which metric to return"),
    start_year: int = Query(2015, ge=2015, le=2024, description="Start year (inclusive)"),
    end_year:   int = Query(2024, ge=2015, le=2024, description="End year (inclusive)"),
) -> TimeseriesResponse:
    """
    Returns annual values for a chosen metric across one or all countries.

    **Metric choices:**
    - `esg_budget` — ESG budget (USD million)
    - `renewable_investment` — Renewable energy investment (USD million)
    - `esg_score` — Composite ESG score (0–100)
    - `carbon_emissions` — Carbon emissions (metric tons)
    - `green_bonds` — Green bonds issued (USD million)
    """
    if start_year > end_year:
        raise HTTPException(status_code=422, detail="`start_year` must be ≤ `end_year`.")

    df: pd.DataFrame = request.app.state.df.copy()
    _validate_country(country, request.app.state.countries)

    col = METRIC_MAP[metric]

    if country:
        df = df[df["country"] == country]

    df = df[(df["year"] >= start_year) & (df["year"] <= end_year)]

    points: list[TimeseriesPoint] = [
        TimeseriesPoint(
            country=str(row["country"]),
            year=int(row["year"]),
            value=round(float(row[col]), 4) if not pd.isna(row[col]) else 0.0,
            metric=metric,
        )
        for _, row in df.sort_values(["country", "year"]).iterrows()
    ]

    return TimeseriesResponse(
        metric=metric,
        countries=sorted(df["country"].unique().tolist()),
        year_range=[start_year, end_year],
        data=points,
    )


# ── GET /api/data/heatmap ─────────────────────────────────────────────────────
@router.get(
    "/heatmap",
    response_model=HeatmapResponse,
    summary="Correlation matrix for heatmap rendering",
)
async def get_heatmap(
    request: Request,
    country: str | None = Query(None, description="Filter to a single country"),
) -> HeatmapResponse:
    """
    Returns the Pearson correlation matrix of all numeric ESG variables,
    formatted as a nested JSON object ready for D3/Plotly heatmap rendering.

    The `matrix` field is shaped as `{column_label: {column_label: float}}`.
    Values range from -1 (perfect negative correlation) to +1 (perfect positive).
    """
    df: pd.DataFrame = request.app.state.df.copy()
    _validate_country(country, request.app.state.countries)

    if country:
        df = df[df["country"] == country]

    # Compute correlation matrix on the canonical numeric columns
    available_cols = [c for c in CORR_COLS if c in df.columns]
    label_map = dict(zip(CORR_COLS, CORR_LABELS))

    corr = df[available_cols].corr().round(4)

    # Rename index and columns to friendly labels
    corr.index   = [label_map.get(c, c) for c in corr.index]
    corr.columns = [label_map.get(c, c) for c in corr.columns]

    # Convert to nested dict; replace NaN with null-safe 0.0
    matrix: dict[str, dict[str, float]] = {
        str(row): {
            str(col): float(val) if not np.isnan(val) else 0.0
            for col, val in row_data.items()
        }
        for row, row_data in corr.iterrows()
    }

    return HeatmapResponse(
        columns=list(corr.columns),
        matrix=matrix,
        filtered_country=country,
    )


# ── GET /api/data/sectors ─────────────────────────────────────────────────────
@router.get(
    "/sectors",
    response_model=SectorResponse,
    summary="Investment breakdown by clean-energy sector",
)
async def get_sectors(
    request: Request,
    country: str | None = Query(None, description="Filter to a single country"),
) -> SectorResponse:
    """
    Returns cumulative renewable energy investment totalled by sector.
    Useful for rendering a pie / donut chart in the frontend.

    Optionally filtered to a single country — the sector mix can vary
    significantly (e.g. Jordan skews Wind, UAE skews Solar).
    """
    df: pd.DataFrame = request.app.state.df.copy()
    _validate_country(country, request.app.state.countries)

    if country:
        df = df[df["country"] == country]

    sector_grp = (
        df.groupby("sector")
        .agg(
            total_re_investment_usd_million=("renewable_energy_investment_usd_million", "sum"),
            country_count=("country", "nunique"),
        )
        .reset_index()
        .sort_values("total_re_investment_usd_million", ascending=False)
    )

    sectors: list[SectorBreakdown] = [
        SectorBreakdown(
            sector=str(row["sector"]),
            total_re_investment_usd_million=round(float(row["total_re_investment_usd_million"]), 2),
            country_count=int(row["country_count"]),
        )
        for _, row in sector_grp.iterrows()
    ]

    return SectorResponse(filtered_country=country, sectors=sectors)
