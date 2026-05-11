"""
streamlit_app/pages/forecasting.py
------------------------------------
🔮 Forecasting — Prophet actuals + forecast chart, tabular predictions,
all-countries 2030 bar chart, and methodology explainer.
"""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from utils import (
    COUNTRY_ORDER, PALETTE, SECTOR_PALETTE,
    apply_chart_defaults, kpi_card, section_header,
)


def _forecast_chart(df: pd.DataFrame, fc: pd.DataFrame, country: str) -> go.Figure:
    """
    Builds the combined actuals + forecast + confidence band chart for one country.
    """
    hist = df[df["country"] == country].sort_values("year")
    fore = fc[fc["country"] == country].sort_values("year")
    color = PALETTE.get(country, "#17A398")

    fig = go.Figure()

    # ── Confidence band (fill between lower and upper) ────────────────────────
    fig.add_trace(go.Scatter(
        x=list(fore["year"]) + list(fore["year"][::-1]),
        y=list(fore["upper_bound"]) + list(fore["lower_bound"][::-1]),
        fill="toself",
        fillcolor=f"rgba({int(color[1:3], 16)},{int(color[3:5], 16)},{int(color[5:7], 16)},0.15)",
        line=dict(color="rgba(0,0,0,0)"),
        name="80% Confidence Interval",
        showlegend=True,
        hoverinfo="skip",
    ))

    # ── Forecast line ─────────────────────────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=fore["year"], y=fore["predicted_budget"],
        mode="lines",
        name="Forecast (2025–2030)",
        line=dict(color=color, width=2.5, dash="dot"),
        hovertemplate="<b>%{x}</b><br>Forecast: $%{y:,.0f}M<extra></extra>",
    ))

    # ── Historical actuals ────────────────────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=hist["year"], y=hist["esg_budget_usd_million"],
        mode="lines+markers",
        name="Historical Actuals",
        line=dict(color=color, width=2.5),
        marker=dict(size=7, color=color, line=dict(color="#0D1117", width=1.5)),
        hovertemplate="<b>%{x}</b><br>Actual: $%{y:,.0f}M<extra></extra>",
    ))

    # ── Train / forecast boundary line ────────────────────────────────────────
    fig.add_vline(
        x=2024.5, line_dash="dash", line_color="#8B949E", line_width=1.2,
        annotation_text="  Forecast →", annotation_position="top right",
        annotation_font=dict(color="#8B949E", size=10),
    )

    # ── Key event markers ─────────────────────────────────────────────────────
    events = [(2021, "COP26 / UAE Net Zero"), (2025, "Vision 2030 Milestone")]
    for yr, label in events:
        fig.add_vline(
            x=yr, line_dash="dot", line_color="#E63946", line_width=0.9, opacity=0.7,
            annotation_text=f"  {label}", annotation_position="top left",
            annotation_font=dict(color="#E63946", size=9),
        )

    fig.update_layout(
        title=f"{country} — ESG Budget: Historical Actuals & Prophet Forecast 2025–2030",
        xaxis=dict(dtick=1),
        yaxis_tickprefix="$", yaxis_ticksuffix="M",
        hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
    )
    apply_chart_defaults(fig, height=460)
    return fig


def _all_countries_2030_bar(df: pd.DataFrame, fc: pd.DataFrame) -> go.Figure:
    """Horizontal bar chart: 2030 predicted budget vs 2024 actual."""
    fc_2030  = fc[fc["year"] == 2030].set_index("country")["predicted_budget"]
    act_2024 = df[df["year"] == 2024].set_index("country")["esg_budget_usd_million"]

    rows = []
    for c in COUNTRY_ORDER:
        if c in fc_2030.index and c in act_2024.index:
            rows.append({
                "country": c,
                "2024 Actual": act_2024[c],
                "2030 Forecast": fc_2030[c],
                "pct_change": ((fc_2030[c] - act_2024[c]) / act_2024[c]) * 100,
            })
    cmp = pd.DataFrame(rows).sort_values("2030 Forecast", ascending=True)

    fig = go.Figure()
    fig.add_trace(go.Bar(
        y=cmp["country"], x=cmp["2024 Actual"],
        orientation="h", name="2024 Actual",
        marker_color=[PALETTE.get(c, "#888") for c in cmp["country"]],
        opacity=0.45,
        hovertemplate="<b>%{y}</b><br>2024 Actual: $%{x:,.0f}M<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        y=cmp["country"], x=cmp["2030 Forecast"],
        orientation="h", name="2030 Forecast",
        marker_color=[PALETTE.get(c, "#888") for c in cmp["country"]],
        hovertemplate="<b>%{y}</b><br>2030 Forecast: $%{x:,.0f}M (+%{customdata:.1f}%)<extra></extra>",
        customdata=cmp["pct_change"],
    ))
    fig.update_layout(
        title="All Countries — 2024 Actual vs 2030 Forecast (sorted by forecast)",
        barmode="overlay",
        xaxis_tickprefix="$", xaxis_ticksuffix="M",
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    apply_chart_defaults(fig, height=380)
    return fig


def render() -> None:
    df: pd.DataFrame = st.session_state["df"]
    fc: pd.DataFrame = st.session_state["forecasts"]

    st.markdown(
        "<h1 style='color:#17A398; font-size:1.9rem;'>🔮 ESG Budget Forecasting</h1>"
        "<p style='color:#8B949E;'>Prophet time-series forecasts with GDP, Policy Index, and Oil Revenue as regressors.</p>",
        unsafe_allow_html=True,
    )

    if fc.empty:
        st.error("Forecast data not found. Run `backend/models/forecaster.py` to generate `data/processed/forecasts.csv`.")
        return

    # ── Country selector ──────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown("---")
        st.markdown("**🔧 Forecast Controls**")
        country = st.selectbox("Select country", COUNTRY_ORDER, index=0, key="fc_country")

    # ── KPI strip for selected country ────────────────────────────────────────
    section_header(f"📌 {country} — Forecast Summary")
    fc_c  = fc[fc["country"] == country].sort_values("year")
    budget_2030 = float(fc_c[fc_c["year"] == 2030]["predicted_budget"].values[0])
    budget_2025 = float(fc_c[fc_c["year"] == 2025]["predicted_budget"].values[0])
    actual_2024 = float(df[(df["country"] == country) & (df["year"] == 2024)]["esg_budget_usd_million"].values[0])
    growth_2030 = ((budget_2030 - actual_2024) / actual_2024) * 100
    cagr = ((budget_2030 / actual_2024) ** (1/6) - 1) * 100

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(kpi_card("2025 Forecast", f"${budget_2025:,.0f}M", f"vs ${actual_2024:,.0f}M (2024)"), unsafe_allow_html=True)
    with c2:
        st.markdown(kpi_card("2030 Forecast", f"${budget_2030:,.0f}M", f"+{growth_2030:.1f}% from 2024"), unsafe_allow_html=True)
    with c3:
        st.markdown(kpi_card("Implied CAGR", f"{cagr:.1f}%", "2024→2030 compound growth"), unsafe_allow_html=True)

    st.markdown("<br/>", unsafe_allow_html=True)

    # ── Main forecast chart ───────────────────────────────────────────────────
    section_header("📈 Historical Actuals + Prophet Forecast")
    st.plotly_chart(_forecast_chart(df, fc, country), use_container_width=True)

    # ── Forecast data table ───────────────────────────────────────────────────
    section_header("📋 Predicted Values 2025–2030")
    fc_table = (
        fc_c[fc_c["year"].between(2025, 2030)]
        [["year", "predicted_budget", "lower_bound", "upper_bound"]]
        .rename(columns={
            "year": "Year",
            "predicted_budget": "Predicted (USD M)",
            "lower_bound": "Lower Bound (USD M)",
            "upper_bound": "Upper Bound (USD M)",
        })
        .reset_index(drop=True)
    )
    st.dataframe(
        fc_table.style.format({
            "Predicted (USD M)": "${:,.0f}",
            "Lower Bound (USD M)": "${:,.0f}",
            "Upper Bound (USD M)": "${:,.0f}",
        }).background_gradient(subset=["Predicted (USD M)"], cmap="Greens"),
        use_container_width=True,
    )

    # ── All countries 2030 comparison ─────────────────────────────────────────
    section_header("🌍 All Countries — 2030 Forecast Comparison")
    st.plotly_chart(_all_countries_2030_bar(df, fc), use_container_width=True)

    # ── Methodology expander ──────────────────────────────────────────────────
    with st.expander("📖 About this forecast — How it works"):
        st.markdown("""
**Prophet by Meta** is an open-source time-series forecasting library built for business
forecasts that have strong trend components and irregular changepoints.

**Why Prophet for ESG budgets?**
Traditional ARIMA models require stationary series and struggle with structural breaks
(like COP26 in 2021). Prophet handles these automatically via changepoint detection —
it sees the 2021 acceleration not as noise, but as a genuine regime shift.

**Model setup:**
- One Prophet model is fitted **per country** (8 models total), since each country
  has a distinct budget trajectory, GDP scale, and policy environment.
- **External regressors** added to each model:
  - `gdp_usd_billion` — larger economies tend to commit more in absolute terms
  - `policy_index` — stronger regulatory frameworks accelerate ESG spending
  - `oil_revenue_usd_billion` — captures the revenue capacity that funds clean energy transitions
- Regressor values for 2025–2030 are **linearly extrapolated** from the last 3 observed years —
  a conservative assumption. Actual forecasts would use IMF/World Bank macro projections.

**Confidence intervals:**
The shaded band represents the **80% credible interval** — there is an 80% probability
(under the model's assumptions) that the true future budget falls within this range.
Wider bands = more uncertainty, typically for countries with volatile spending patterns.

**Limitations:**
This is a synthetic dataset, so treat forecasts as *directional* rather than actionable.
In production, you'd retrain monthly as new budget data becomes available.
        """)
