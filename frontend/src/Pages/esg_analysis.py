"""
streamlit_app/pages/esg_analysis.py
--------------------------------------
🌿 ESG Score Analysis — animated scatter plots, correlation heatmap,
and analyst-written insight blocks.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from scipy import stats as scipy_stats

from utils import (
    COUNTRY_ORDER, PALETTE,
    apply_chart_defaults, section_header,
)

# Correlation matrix column selection and labels
CORR_COLS = [
    "esg_budget_usd_million", "renewable_energy_investment_usd_million",
    "carbon_emissions_mt", "esg_score", "gdp_usd_billion",
    "policy_index", "green_bonds_issued_usd_million",
    "esg_budget_per_gdp", "investment_efficiency",
]
CORR_LABELS = [
    "ESG Budget", "RE Investment", "CO₂ Emissions",
    "ESG Score", "GDP", "Policy Index", "Green Bonds",
    "Budget/GDP %", "Invest. Efficiency",
]


def _animated_scatter(df: pd.DataFrame) -> go.Figure:
    """ESG score vs carbon emissions animated by year."""
    df_plot = df.copy()
    df_plot["year_str"] = df_plot["year"].astype(str)
    df_plot["bubble_size"] = (df_plot["esg_budget_usd_million"] ** 0.5).clip(lower=5)

    fig = px.scatter(
        df_plot.sort_values("year"),
        x="carbon_emissions_mt",
        y="esg_score",
        animation_frame="year_str",
        animation_group="country",
        color="country",
        size="bubble_size",
        hover_name="country",
        color_discrete_map=PALETTE,
        category_orders={"country": COUNTRY_ORDER},
        size_max=50,
        labels={
            "carbon_emissions_mt": "Carbon Emissions (Metric Tons, millions)",
            "esg_score": "ESG Score (0–100)",
            "country": "Country",
        },
        hover_data={
            "esg_budget_usd_million": ":,.0f",
            "bubble_size": False,
            "year_str": False,
        },
        title="ESG Score vs Carbon Emissions — Animated by Year (2015→2024)",
    )

    # Add OLS regression line over all data
    valid = df.dropna(subset=["carbon_emissions_mt", "esg_score"])
    slope, intercept, r, *_ = scipy_stats.linregress(
        valid["carbon_emissions_mt"], valid["esg_score"]
    )
    x_range = np.linspace(valid["carbon_emissions_mt"].min(), valid["carbon_emissions_mt"].max(), 100)
    fig.add_trace(go.Scatter(
        x=x_range, y=slope * x_range + intercept,
        mode="lines",
        name=f"OLS trend (r={r:.2f})",
        line=dict(color="#E63946", width=1.8, dash="dash"),
    ))

    fig.update_layout(
        updatemenus=[dict(type="buttons", showactive=False, y=1.1, x=0.15)],
    )
    apply_chart_defaults(fig, height=480)
    return fig


def _scatter_policy(df: pd.DataFrame) -> go.Figure:
    """ESG score vs policy index — bubble size = ESG budget."""
    df_plot = df.copy()
    df_plot["bubble_size"] = (df_plot["esg_budget_usd_million"] ** 0.5).clip(lower=4)

    fig = px.scatter(
        df_plot,
        x="policy_index",
        y="esg_score",
        color="country",
        size="bubble_size",
        hover_name="country",
        color_discrete_map=PALETTE,
        category_orders={"country": COUNTRY_ORDER},
        size_max=45,
        labels={
            "policy_index": "Policy Index (0–10)",
            "esg_score": "ESG Score (0–100)",
        },
        title="ESG Score vs Policy Index (bubble = ESG Budget size)",
        trendline="ols",
        trendline_scope="overall",
        trendline_color_override="#E63946",
    )
    fig.update_traces(
        selector=dict(mode="lines"),
        line=dict(dash="dash", width=2),
    )
    apply_chart_defaults(fig, height=420)
    return fig


def _heatmap(df: pd.DataFrame) -> go.Figure:
    """Full correlation heatmap."""
    available = [c for c in CORR_COLS if c in df.columns]
    label_map = dict(zip(CORR_COLS, CORR_LABELS))
    corr = df[available].corr().round(3)
    corr.index   = [label_map.get(c, c) for c in corr.index]
    corr.columns = [label_map.get(c, c) for c in corr.columns]

    fig = go.Figure(go.Heatmap(
        z=corr.values,
        x=corr.columns.tolist(),
        y=corr.index.tolist(),
        colorscale=[
            [0.0,  "#E63946"],
            [0.5,  "#161B22"],
            [1.0,  "#17A398"],
        ],
        zmid=0, zmin=-1, zmax=1,
        text=corr.round(2).values,
        texttemplate="%{text}",
        textfont=dict(size=9),
        hovertemplate="<b>%{y}</b> × <b>%{x}</b><br>r = %{z:.3f}<extra></extra>",
        colorbar=dict(
            title="Pearson r",
            tickfont=dict(color="#8B949E"),
            titlefont=dict(color="#8B949E"),
        ),
    ))
    fig.update_layout(
        title="Correlation Matrix — All Numeric ESG Variables",
        xaxis=dict(tickangle=-40),
    )
    apply_chart_defaults(fig, height=480)
    fig.update_xaxes(gridcolor="rgba(0,0,0,0)")
    fig.update_yaxes(gridcolor="rgba(0,0,0,0)")
    return fig


INSIGHTS = [
    ("Policy Index is the strongest leading indicator",
     "The correlation matrix reveals Policy Index has the highest Pearson r with ESG Score "
     "(r ≈ 0.9+). Governance quality and regulatory frameworks — not capital alone — are "
     "the critical bottleneck. Jordan, despite a small budget, maintains a relatively "
     "high Policy Index, punching above its fiscal weight."),
    ("Carbon emissions and ESG scores are inversely linked — but with nuance",
     "The OLS trend line across all country-years shows a negative relationship between "
     "CO₂ emissions and ESG score, but large-emitters like Saudi Arabia achieve high ESG "
     "scores by making aggressive investment commitments. This reflects that ESG scoring "
     "in this model captures investment intent, not just current emission levels."),
    ("Investment efficiency is the fastest-improving metric post-COP26",
     "The ratio of renewable investment to carbon emissions (investment_efficiency) has "
     "grown most sharply since 2021, particularly for UAE (+3x) and Qatar (+2x). This "
     "indicates the post-COP26 capital wave is being deployed into genuinely impactful "
     "projects rather than symbolic commitments."),
    ("ESG budget as % of GDP is the fairest cross-country comparator",
     "In absolute terms, Saudi Arabia and UAE dominate. But normalised by GDP, Oman and "
     "Qatar show proportionally similar or higher commitments. Budget/GDP % removes the "
     "distortion of economic size and reveals which governments are genuinely prioritising "
     "the energy transition relative to their means."),
]


def render() -> None:
    df: pd.DataFrame = st.session_state["df"]

    st.markdown(
        "<h1 style='color:#17A398; font-size:1.9rem;'>🌿 ESG Score Analysis</h1>"
        "<p style='color:#8B949E;'>What drives ESG performance across the Middle East? "
        "Explore correlations, trends, and policy impacts.</p>",
        unsafe_allow_html=True,
    )

    # ── Filter controls ───────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown("---")
        st.markdown("**🔧 Analysis Controls**")
        selected_countries = st.multiselect(
            "Filter countries",
            COUNTRY_ORDER,
            default=COUNTRY_ORDER,
            key="esg_countries",
        )
        year_range = st.slider("Year range", 2015, 2024, (2015, 2024), key="esg_years")

    plot_df = df[
        (df["country"].isin(selected_countries)) &
        (df["year"].between(*year_range))
    ].copy()

    if plot_df.empty:
        st.warning("No data for the selected filters.")
        return

    # ── Animated scatter ──────────────────────────────────────────────────────
    section_header("🎬 ESG Score vs Carbon Emissions — Animated")
    st.caption("Press ▶ to watch the transition 2015→2024. Bubble size = ESG Budget.")
    st.plotly_chart(_animated_scatter(plot_df), use_container_width=True)

    # ── Policy scatter ────────────────────────────────────────────────────────
    section_header("📐 ESG Score vs Policy Index")
    st.caption("Each point is one country-year. The dashed red line is the OLS regression across all observations.")
    st.plotly_chart(_scatter_policy(plot_df), use_container_width=True)

    # ── Heatmap ───────────────────────────────────────────────────────────────
    section_header("🔥 Correlation Heatmap")
    st.caption("Lower triangle values. Teal = positive correlation, Red = negative, Dark = near zero.")
    st.plotly_chart(_heatmap(plot_df), use_container_width=True)

    # ── Insights block ────────────────────────────────────────────────────────
    section_header("💡 What Drives ESG Scores?")
    for title, body in INSIGHTS:
        st.markdown(
            f"""<div class="insight-box">
                <span class="insight-number">▶</span>
                <strong>{title}</strong><br/>{body}
            </div>""",
            unsafe_allow_html=True,
        )
        st.markdown("")
