"""
backend/schemas.py
-------------------
Pydantic v2 response models for every API endpoint.

Keeping all schemas in one file makes it trivial to:
  - Generate OpenAPI documentation automatically (FastAPI reads these)
  - Enforce consistent field naming across routers
  - Catch serialisation bugs at startup rather than at request time

Naming convention: <Domain><Entity>Response
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Shared / primitives
# ─────────────────────────────────────────────────────────────────────────────

class APIInfo(BaseModel):
    """Root endpoint — API metadata."""
    title:       str
    version:     str
    description: str
    routes:      list[str]


# ─────────────────────────────────────────────────────────────────────────────
# /api/data  schemas
# ─────────────────────────────────────────────────────────────────────────────

class CountriesResponse(BaseModel):
    """List of all countries available in the dataset."""
    countries: list[str]
    count:     int


class CountrySummary(BaseModel):
    """Per-country aggregate block inside the overview response."""
    country:                          str
    total_esg_budget_usd_million:     float
    total_re_investment_usd_million:  float
    avg_esg_score:                    float
    avg_policy_index:                 float
    latest_year:                      int
    earliest_year:                    int


class SectorBreakdown(BaseModel):
    """Investment totals split by clean-energy sector."""
    sector:                          str
    total_re_investment_usd_million: float
    country_count:                   int


class OverviewResponse(BaseModel):
    """
    High-level dataset summary — feeds the dashboard KPI strip.
    Optional `country` filter narrows to a single country.
    """
    date_range:        list[int]              # [min_year, max_year]
    filtered_country:  str | None
    country_summaries: list[CountrySummary]
    sector_breakdown:  list[SectorBreakdown]
    total_countries:   int


class TimeseriesPoint(BaseModel):
    """Single year data point for a given country/metric."""
    country: str
    year:    int
    value:   float
    metric:  str


class TimeseriesResponse(BaseModel):
    """Year-by-year time series for one or all countries."""
    metric:       str
    countries:    list[str]
    year_range:   list[int]
    data:         list[TimeseriesPoint]


class HeatmapResponse(BaseModel):
    """
    Correlation matrix ready for frontend heatmap rendering.
    `matrix` is a dict-of-dicts: {col_a: {col_b: correlation_value}}.
    """
    columns:          list[str]
    matrix:           dict[str, dict[str, float]]
    filtered_country: str | None


class SectorResponse(BaseModel):
    """Investment breakdown by sector — optionally filtered by country."""
    filtered_country: str | None
    sectors:          list[SectorBreakdown]


# ─────────────────────────────────────────────────────────────────────────────
# /api/forecast  schemas
# ─────────────────────────────────────────────────────────────────────────────

class HistoricalPoint(BaseModel):
    """One year of observed ESG budget data."""
    year:                   int
    esg_budget_usd_million: float


class ForecastPoint(BaseModel):
    """One year of Prophet-generated forecast with credible bounds."""
    year:             int
    predicted_budget: float
    lower_bound:      float
    upper_bound:      float


class CountryForecastResponse(BaseModel):
    """Full forecast payload for a single country."""
    country:    str
    historical: list[HistoricalPoint]
    forecast:   list[ForecastPoint]


class CompareEntry(BaseModel):
    """One row in the multi-country 2030 comparison table."""
    country:              str
    predicted_2030:       float
    actual_2024:          float
    pct_change_2024_2030: float    # ((pred_2030 - act_2024) / act_2024) * 100


class CompareResponse(BaseModel):
    """All-country side-by-side forecast comparison for 2030."""
    reference_year:  int
    forecast_year:   int
    countries:       list[CompareEntry]


class FeatureImportance(BaseModel):
    feature:    str
    importance: float


class ModelMetrics(BaseModel):
    RMSE: float
    MAE:  float
    R2:   float


class ModelInfoResponse(BaseModel):
    """Contents of model_report.json — served to the frontend for a model card."""
    best_model:                        str
    train_years:                       str
    test_years:                        str
    model_metrics:                     dict[str, ModelMetrics]
    feature_importances_random_forest: list[FeatureImportance]
    prophet_status:                    str


# ─────────────────────────────────────────────────────────────────────────────
# /api/insights  schemas
# ─────────────────────────────────────────────────────────────────────────────

class TopPerformerEntry(BaseModel):
    rank:    int
    country: str
    value:   float
    metric:  str


class TopPerformersResponse(BaseModel):
    """Top 3 countries across three performance dimensions."""
    highest_esg_score_growth:    list[TopPerformerEntry]
    highest_investment_efficiency: list[TopPerformerEntry]
    highest_yoy_growth_3yr:      list[TopPerformerEntry]


class AnomalyEntry(BaseModel):
    """A single flagged anomaly row."""
    country:               str
    year:                  int
    esg_budget_usd_million: float
    rolling_mean:          float
    std_dev:               float
    z_score:               float
    reason:                str


class AnomaliesResponse(BaseModel):
    """All anomalies flagged by the 2-sigma rule."""
    threshold_std:  float
    anomaly_count:  int
    anomalies:      list[AnomalyEntry]


class PolicyImpactEntry(BaseModel):
    """Per-country policy-effectiveness regression result."""
    rank:               int
    country:            str
    correlation:        float       # Pearson r between policy_index and esg_budget
    slope_usd_per_unit: float       # OLS slope: USD million per 1-unit policy increase
    r_squared:          float
    interpretation:     str         # human-readable label


class PolicyImpactResponse(BaseModel):
    """Ranked list of countries by policy → budget correlation strength."""
    metric_explained: str
    results:          list[PolicyImpactEntry]
