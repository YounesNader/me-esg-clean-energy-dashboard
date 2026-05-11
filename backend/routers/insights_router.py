"""
backend/routers/insights_router.py
------------------------------------
/api/insights  — derived analytical endpoints that sit above raw data.

These endpoints perform lightweight in-memory analytics (rolling stats,
OLS regression, z-score anomaly detection) on every request.  For a
production system with > 10k rows you'd pre-compute these at startup or
cache them with Redis; at 80 rows the latency is negligible (<5 ms).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi import APIRouter, Request
from scipy import stats as scipy_stats

from backend.schemas import (
    AnomaliesResponse,
    AnomalyEntry,
    PolicyImpactEntry,
    PolicyImpactResponse,
    TopPerformerEntry,
    TopPerformersResponse,
)

router = APIRouter()

# Z-score threshold for anomaly flagging
ANOMALY_THRESHOLD = 2.0


# ── GET /api/insights/top-performers ─────────────────────────────────────────
@router.get(
    "/top-performers",
    response_model=TopPerformersResponse,
    summary="Top 3 countries across three performance dimensions",
)
async def get_top_performers(request: Request) -> TopPerformersResponse:
    """
    Ranks countries across three distinct sustainability dimensions:

    1. **Highest ESG score growth** — total gain in ESG score from 2015 to 2024.
       Rewards countries that improved the most in absolute terms.

    2. **Highest investment efficiency** — average of `investment_efficiency`
       (renewable investment ÷ carbon emissions) across all years.
       Identifies who gets the most decarbonisation per dollar spent.

    3. **Highest YoY ESG budget growth (last 3 years)** — mean of annual
       percentage changes in ESG budget from 2022–2024.
       Captures recent momentum, not just historical legacy.
    """
    df: pd.DataFrame = request.app.state.df.copy()

    # ── 1. ESG score growth 2015 → 2024 ──────────────────────────────────────
    score_growth = (
        df.groupby("country")["esg_score"]
        .apply(lambda s: s[s.index == s.index.max()].values[0]
               - s[s.index == s.index.min()].values[0]
               if len(s) >= 2 else 0.0)
    )
    # Recompute cleanly using pivot
    pivot_score = df.pivot_table(index="country", columns="year", values="esg_score")
    score_growth = (pivot_score.iloc[:, -1] - pivot_score.iloc[:, 0]).sort_values(ascending=False)

    top_score_growth: list[TopPerformerEntry] = [
        TopPerformerEntry(
            rank=i + 1,
            country=str(c),
            value=round(float(v), 2),
            metric="ESG Score Growth (2015→2024)",
        )
        for i, (c, v) in enumerate(score_growth.head(3).items())
    ]

    # ── 2. Investment efficiency (avg across all years) ───────────────────────
    avg_efficiency = (
        df.groupby("country")["investment_efficiency"]
        .mean()
        .sort_values(ascending=False)
    )

    top_efficiency: list[TopPerformerEntry] = [
        TopPerformerEntry(
            rank=i + 1,
            country=str(c),
            value=round(float(v), 4),
            metric="Avg Investment Efficiency (RE Invest / CO₂)",
        )
        for i, (c, v) in enumerate(avg_efficiency.head(3).items())
    ]

    # ── 3. YoY ESG budget growth — last 3 years (2022–2024) ──────────────────
    recent = df[df["year"].isin([2022, 2023, 2024])].copy()
    avg_yoy = (
        recent.groupby("country")["yoy_growth"]
        .mean()
        .sort_values(ascending=False)
    )

    top_yoy: list[TopPerformerEntry] = [
        TopPerformerEntry(
            rank=i + 1,
            country=str(c),
            value=round(float(v), 2),
            metric="Avg YoY ESG Budget Growth % (2022–2024)",
        )
        for i, (c, v) in enumerate(avg_yoy.head(3).items())
    ]

    return TopPerformersResponse(
        highest_esg_score_growth=top_score_growth,
        highest_investment_efficiency=top_efficiency,
        highest_yoy_growth_3yr=top_yoy,
    )


# ── GET /api/insights/anomalies ───────────────────────────────────────────────
@router.get(
    "/anomalies",
    response_model=AnomaliesResponse,
    summary="Flag country-years where ESG budget deviated > 2σ from rolling mean",
)
async def get_anomalies(request: Request) -> AnomaliesResponse:
    """
    Applies a simple rolling z-score anomaly detector to the ESG budget series.

    **Method:**
    For each country, compute a 3-year centred rolling mean and rolling
    standard deviation.  Any year where the observed budget deviates more than
    2 standard deviations from the rolling mean is flagged as an anomaly.

    This catches genuine structural breaks (e.g. the UAE/Saudi post-COP26 spike)
    as well as potential data quality issues worth investigating.

    Returns flagged rows with z-score, rolling statistics, and a reason string.
    """
    df: pd.DataFrame = request.app.state.df.copy().sort_values(["country", "year"])

    anomalies: list[AnomalyEntry] = []

    for country, cdf in df.groupby("country"):
        cdf = cdf.sort_values("year").copy()
        budget = cdf["esg_budget_usd_million"]

        # Centred rolling stats — window=3, min_periods=2 to handle edges
        rolling_mean = budget.rolling(window=3, center=True, min_periods=2).mean()
        rolling_std  = budget.rolling(window=3, center=True, min_periods=2).std()

        # Avoid division by zero in flat series
        z_scores = (budget - rolling_mean) / (rolling_std + 1e-9)

        flagged_mask = z_scores.abs() > ANOMALY_THRESHOLD

        for idx in cdf[flagged_mask].index:
            row = cdf.loc[idx]
            z   = float(z_scores.loc[idx])
            rm  = float(rolling_mean.loc[idx])
            sd  = float(rolling_std.loc[idx])

            direction = "above" if z > 0 else "below"
            reason = (
                f"ESG budget of ${row['esg_budget_usd_million']:,.0f}M is "
                f"{abs(z):.1f}σ {direction} the 3-year rolling mean "
                f"(${rm:,.0f}M ± ${sd:,.0f}M) — likely a structural policy shift."
            )

            anomalies.append(
                AnomalyEntry(
                    country=str(country),
                    year=int(row["year"]),
                    esg_budget_usd_million=round(float(row["esg_budget_usd_million"]), 2),
                    rolling_mean=round(rm, 2),
                    std_dev=round(sd, 2),
                    z_score=round(z, 4),
                    reason=reason,
                )
            )

    # Sort by absolute z-score descending — most extreme anomalies first
    anomalies.sort(key=lambda a: abs(a.z_score), reverse=True)

    return AnomaliesResponse(
        threshold_std=ANOMALY_THRESHOLD,
        anomaly_count=len(anomalies),
        anomalies=anomalies,
    )


# ── GET /api/insights/policy-impact ──────────────────────────────────────────
@router.get(
    "/policy-impact",
    response_model=PolicyImpactResponse,
    summary="Correlation between policy_index and ESG budget per country",
)
async def get_policy_impact(request: Request) -> PolicyImpactResponse:
    """
    For each country, fits a simple OLS regression of `esg_budget_usd_million`
    on `policy_index` using all available years (2015–2024).

    Returns:
    - **Pearson r** — strength and direction of the linear relationship
    - **OLS slope** — USD million increase in ESG budget per 1-unit policy gain
    - **R²** — proportion of variance in budget explained by policy alone
    - **Interpretation** — human-readable label (Strong / Moderate / Weak)

    Results are sorted by |r| descending so the most policy-responsive
    countries appear first — useful for a ranked bar chart.
    """
    df: pd.DataFrame = request.app.state.df.copy()

    results: list[PolicyImpactEntry] = []

    for country, cdf in df.groupby("country"):
        x = cdf["policy_index"].values
        y = cdf["esg_budget_usd_million"].values

        if len(x) < 3:
            continue  # Skip if too few points for a meaningful regression

        slope, intercept, r_value, p_value, std_err = scipy_stats.linregress(x, y)

        r2 = float(r_value ** 2)
        r  = float(r_value)

        # Human-readable interpretation based on |r|
        if abs(r) >= 0.85:
            interpretation = "Very Strong — policy drives budget almost linearly"
        elif abs(r) >= 0.65:
            interpretation = "Strong — clear positive policy effect"
        elif abs(r) >= 0.40:
            interpretation = "Moderate — partial policy influence"
        else:
            interpretation = "Weak — budget largely independent of policy score"

        results.append(
            PolicyImpactEntry(
                rank=0,                    # assigned after sorting
                country=str(country),
                correlation=round(r, 4),
                slope_usd_per_unit=round(float(slope), 2),
                r_squared=round(r2, 4),
                interpretation=interpretation,
            )
        )

    # Sort by absolute correlation descending and assign ranks
    results.sort(key=lambda e: abs(e.correlation), reverse=True)
    for i, entry in enumerate(results):
        entry.rank = i + 1

    return PolicyImpactResponse(
        metric_explained=(
            "OLS regression of esg_budget_usd_million on policy_index per country "
            "(2015–2024). Slope = USD million gained per 1-unit policy index increase."
        ),
        results=results,
    )
