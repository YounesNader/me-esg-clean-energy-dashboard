"""
backend/routers/forecast_router.py
------------------------------------
/api/forecast  — endpoints that serve Prophet forecast data and ML model info.

Route ordering matters in FastAPI: specific literal paths (/compare,
/model-info) must be registered BEFORE parameterised paths (/{country})
otherwise FastAPI would try to match "compare" as a country name and
return a 404.  The order of @router.get declarations below is intentional.
"""

from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, HTTPException, Request

from backend.schemas import (
    CompareEntry,
    CompareResponse,
    CountryForecastResponse,
    FeatureImportance,
    ForecastPoint,
    HistoricalPoint,
    ModelInfoResponse,
    ModelMetrics,
)

router = APIRouter()


# ── GET /api/forecast/compare ─────────────────────────────────────────────────
# ⚠️  Registered BEFORE /{country} so "compare" isn't parsed as a country name
@router.get(
    "/compare",
    response_model=CompareResponse,
    summary="Compare 2030 forecast for all countries",
)
async def get_forecast_compare(request: Request) -> CompareResponse:
    """
    Returns the 2030 predicted ESG budget for all 8 countries side by side,
    sorted descending by forecast value.

    Also includes the 2024 actual budget and the percentage change from
    2024 → 2030 so the frontend can render a growth indicator.
    """
    fc_df: pd.DataFrame  = request.app.state.forecasts_df
    hist_df: pd.DataFrame = request.app.state.df

    if fc_df.empty:
        raise HTTPException(status_code=503, detail="Forecast data not available.")

    # 2030 forecast values
    fc_2030 = fc_df[fc_df["year"] == 2030].set_index("country")

    # 2024 actuals
    act_2024 = hist_df[hist_df["year"] == 2024].set_index("country")

    entries: list[CompareEntry] = []
    for country in sorted(fc_2030.index):
        pred_2030 = float(fc_2030.loc[country, "predicted_budget"])
        actual_2024 = (
            float(act_2024.loc[country, "esg_budget_usd_million"])
            if country in act_2024.index
            else 0.0
        )
        pct_change = (
            ((pred_2030 - actual_2024) / actual_2024 * 100)
            if actual_2024 > 0
            else 0.0
        )
        entries.append(
            CompareEntry(
                country=str(country),
                predicted_2030=round(pred_2030, 2),
                actual_2024=round(actual_2024, 2),
                pct_change_2024_2030=round(pct_change, 2),
            )
        )

    # Sort by 2030 prediction descending
    entries.sort(key=lambda e: e.predicted_2030, reverse=True)

    return CompareResponse(
        reference_year=2024,
        forecast_year=2030,
        countries=entries,
    )


# ── GET /api/forecast/model-info ──────────────────────────────────────────────
@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="ML model metrics and feature importances",
)
async def get_model_info(request: Request) -> ModelInfoResponse:
    """
    Returns the contents of model_report.json:
    - Best model name (Ridge vs Random Forest)
    - RMSE, MAE, R² for both models on the 2022–2024 test set
    - Random Forest feature importances (ranked)
    - Prophet forecast status

    Use this to populate a 'Model Card' component in the frontend.
    """
    report: dict = request.app.state.model_report

    if not report:
        raise HTTPException(status_code=503, detail="Model report not available.")

    # Parse model metrics
    raw_metrics = report.get("model_metrics", {})
    model_metrics: dict[str, ModelMetrics] = {
        name: ModelMetrics(
            RMSE=float(vals["RMSE"]),
            MAE=float(vals["MAE"]),
            R2=float(vals["R2"]),
        )
        for name, vals in raw_metrics.items()
    }

    # Feature importances — already sorted descending in the JSON
    raw_fi = report.get("feature_importances_random_forest", {})
    feature_importances: list[FeatureImportance] = [
        FeatureImportance(feature=feat, importance=round(float(imp), 6))
        for feat, imp in sorted(raw_fi.items(), key=lambda x: x[1], reverse=True)
    ]

    pipeline = report.get("pipeline", {})
    prophet  = report.get("prophet_forecast", {})

    return ModelInfoResponse(
        best_model=str(report.get("best_model", "Unknown")),
        train_years=str(pipeline.get("train_years", "2015–2021")),
        test_years=str(pipeline.get("test_years", "2022–2024")),
        model_metrics=model_metrics,
        feature_importances_random_forest=feature_importances,
        prophet_status=str(prophet.get("status", "unknown")),
    )


# ── GET /api/forecast/{country} ───────────────────────────────────────────────
# ⚠️  Parameterised route last — after all literal paths above
@router.get(
    "/{country}",
    response_model=CountryForecastResponse,
    summary="Prophet forecast for a single country (2025–2030)",
)
async def get_country_forecast(country: str, request: Request) -> CountryForecastResponse:
    """
    Returns both the historical actuals (2015–2024) and the Prophet
    forecast (2025–2030) for the requested country.

    Combining actuals + forecast in a single response lets the frontend
    draw a continuous chart without a second API call.

    **Path parameter:** `country` — e.g. `UAE`, `Saudi Arabia`, `Qatar`
    (case-sensitive, must match exact dataset spelling).
    """
    available: list[str] = request.app.state.countries
    if country not in available:
        raise HTTPException(
            status_code=404,
            detail=f"Country '{country}' not found. Available: {available}",
        )

    fc_df:   pd.DataFrame = request.app.state.forecasts_df
    hist_df: pd.DataFrame = request.app.state.df

    # Historical actuals for this country
    hist_rows = (
        hist_df[hist_df["country"] == country]
        .sort_values("year")[["year", "esg_budget_usd_million"]]
    )
    historical: list[HistoricalPoint] = [
        HistoricalPoint(
            year=int(row["year"]),
            esg_budget_usd_million=round(float(row["esg_budget_usd_million"]), 2),
        )
        for _, row in hist_rows.iterrows()
    ]

    # Forecast rows
    if fc_df.empty:
        raise HTTPException(status_code=503, detail="Forecast data not available.")

    fc_rows = fc_df[fc_df["country"] == country].sort_values("year")
    if fc_rows.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast found for '{country}'.",
        )

    forecast: list[ForecastPoint] = [
        ForecastPoint(
            year=int(row["year"]),
            predicted_budget=round(float(row["predicted_budget"]), 2),
            lower_bound=round(float(row["lower_bound"]), 2),
            upper_bound=round(float(row["upper_bound"]), 2),
        )
        for _, row in fc_rows.iterrows()
    ]

    return CountryForecastResponse(
        country=country,
        historical=historical,
        forecast=forecast,
    )
