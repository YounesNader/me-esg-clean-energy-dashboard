"""
streamlit_app/pages/country_deep_dive.py
------------------------------------------
📊 Country Deep Dive — per-country KPIs, multi-metric timeseries,
sector pie chart, and optional side-by-side country comparison.
"""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

from utils import (
    COUNTRY_ORDER, PALETTE, SECTOR_PALETTE,
    apply_chart_defaults, kpi_card, section_header,
)

# Metric choices with friendly labels and units
METRICS: dict[str, tuple[str, str]] = {
    "ESG Budget (USD M)":          ("esg_budget_usd_million",                  "${}M"),
    "RE Investment (USD M)":       ("renewable_energy_investment_usd_million",  "${}M"),
    "ESG Score (0–100)":           ("esg_score",                               "{}"),
    "Carbon Emissions (MT)":       ("carbon_emissions_mt",                     "{}MT"),
    "Solar Capacity (MW)":         ("solar_capacity_mw",                       "{}MW"),
    "Wind Capacity (MW)":          ("wind_capacity_mw",                        "{}MW"),
    "Green Bonds (USD M)":         ("green_bonds_issued_usd_million",           "${}M"),
    "Policy Index (0–10)":         ("policy_index",                            "{}"),
    "Investment Efficiency":       ("investment_efficiency",                   "{}"),
    "ESG Budget % of GDP":         ("esg_budget_per_gdp",                     "{}%"),
}


def _country_kpis(df: pd.DataFrame, country: str) -> None:
    """Render 4 KPI cards for a given country."""
    cdf = df[df["country"] == country]
    total_inv    = cdf["esg_budget_usd_million"].sum()
    score_2015   = float(cdf[cdf["year"] == cdf["year"].min()]["esg_score"].values[0])
    score_2024   = float(cdf[cdf["year"] == cdf["year"].max()]["esg_score"].values[0])
    score_delta  = score_2024 - score_2015
    co2_2015     = float(cdf[cdf["year"] == cdf["year"].min()]["carbon_emissions_mt"].values[0])
    co2_2024     = float(cdf[cdf["year"] == cdf["year"].max()]["carbon_emissions_mt"].values[0])
    co2_change   = ((co2_2024 - co2_2015) / co2_2015) * 100
    avg_eff      = cdf["investment_efficiency"].mean()

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(kpi_card("Total ESG Investment", f"${total_inv/1000:.2f}B", "2015–2024"), unsafe_allow_html=True)
    with c2:
        arrow = "↑" if score_delta >= 0 else "↓"
        color_tag = ""
        st.markdown(kpi_card("ESG Score (2024)", f"{score_2024:.1f}", f"{arrow} {abs(score_delta):.1f} pts since 2015"), unsafe_allow_html=True)
    with c3:
        arrow = "↓" if co2_change < 0 else "↑"
        st.markdown(kpi_card("CO₂ Emissions Δ", f"{arrow} {abs(co2_change):.1f}%", f"2015: {co2_2015:.0f}MT → 2024: {co2_2024:.0f}MT"), unsafe_allow_html=True)
    with c4:
        st.markdown(kpi_card("Avg Invest. Efficiency", f"{avg_eff:.2f}", "RE invest per tonne CO₂"), unsafe_allow_html=True)


def _timeseries_chart(df: pd.DataFrame, country: str, selected_metrics: list[str]) -> go.Figure:
    """Multi-metric line chart for one country."""
    cdf = df[df["country"] == country].sort_values("year")
    color_seq = ["#17A398", "#E09F3E", "#E63946", "#83C5BE", "#A8DADC", "#C9A96E", "#2DC5A2", "#48CAE4", "#9E6B3F", "#F4A261"]

    fig = go.Figure()
    for i, label in enumerate(selected_metrics):
        col = METRICS[label][0]
        fig.add_trace(go.Scatter(
            x=cdf["year"], y=cdf[col],
            mode="lines+markers",
            name=label,
            line=dict(color=color_seq[i % len(color_seq)], width=2.2),
            marker=dict(size=5),
            hovertemplate=f"<b>{label}</b>: %{{y:,.2f}}<extra></extra>",
        ))

    fig.add_vline(x=2021, line_dash="dot", line_color="#E63946", line_width=1.2,
                  annotation_text="COP26", annotation_font=dict(color="#E63946", size=10))
    fig.update_layout(title=f"{country} — Selected Metrics Over Time", hovermode="x unified", xaxis=dict(dtick=1))
    apply_chart_defaults(fig, height=400)
    return fig


def _sector_pie(df: pd.DataFrame, country: str) -> go.Figure:
    """Sector breakdown pie for one country."""
    cdf = df[df["country"] == country]
    sector_data = (
        cdf.groupby("sector")["renewable_energy_investment_usd_million"]
        .sum().reset_index()
        .sort_values("renewable_energy_investment_usd_million", ascending=False)
    )
    fig = go.Figure(go.Pie(
        labels=sector_data["sector"],
        values=sector_data["renewable_energy_investment_usd_million"],
        hole=0.42,
        marker=dict(
            colors=[SECTOR_PALETTE.get(s, "#888") for s in sector_data["sector"]],
            line=dict(color="#0D1117", width=2),
        ),
        textinfo="label+percent",
        hovertemplate="<b>%{label}</b><br>$%{value:,.0f}M<br>%{percent}<extra></extra>",
    ))
    fig.update_layout(
        title=f"{country} — Sector Breakdown (2015–2024)",
        showlegend=True,
    )
    apply_chart_defaults(fig, height=380)
    return fig


def _comparison_chart(df: pd.DataFrame, c1: str, c2: str, metric_label: str) -> go.Figure:
    """Side-by-side line chart comparing two countries on one metric."""
    col = METRICS[metric_label][0]
    fig = go.Figure()
    for country, color in [(c1, PALETTE.get(c1, "#17A398")), (c2, PALETTE.get(c2, "#E09F3E"))]:
        cdf = df[df["country"] == country].sort_values("year")
        fig.add_trace(go.Scatter(
            x=cdf["year"], y=cdf[col],
            mode="lines+markers",
            name=country,
            line=dict(color=color, width=2.4),
            marker=dict(size=6),
            hovertemplate=f"<b>{country}</b>: %{{y:,.2f}}<extra></extra>",
        ))
    fig.update_layout(
        title=f"{c1} vs {c2} — {metric_label}",
        hovermode="x unified", xaxis=dict(dtick=1),
    )
    apply_chart_defaults(fig, height=360)
    return fig


def render() -> None:
    df: pd.DataFrame = st.session_state["df"]

    # ── Header ────────────────────────────────────────────────────────────────
    st.markdown(
        "<h1 style='color:#17A398; font-size:1.9rem;'>📊 Country Deep Dive</h1>"
        "<p style='color:#8B949E;'>Explore detailed ESG and clean energy metrics for any country.</p>",
        unsafe_allow_html=True,
    )

    # ── Sidebar controls ──────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown("---")
        st.markdown("**🔧 Deep Dive Controls**")
        country = st.selectbox("Select Country", COUNTRY_ORDER, index=0)
        selected_metrics = st.multiselect(
            "Metrics to display",
            options=list(METRICS.keys()),
            default=["ESG Budget (USD M)", "ESG Score (0–100)", "Carbon Emissions (MT)"],
        )
        compare_mode = st.toggle("Compare with another country", value=False)
        if compare_mode:
            other_countries = [c for c in COUNTRY_ORDER if c != country]
            compare_country = st.selectbox("Compare with", other_countries, index=0)
            compare_metric  = st.selectbox("Comparison metric", list(METRICS.keys()), index=0)

    # ── KPIs ──────────────────────────────────────────────────────────────────
    section_header(f"📌 {country} — Key Metrics Snapshot")
    _country_kpis(df, country)
    st.markdown("<br/>", unsafe_allow_html=True)

    # ── Timeseries + Sector side by side ──────────────────────────────────────
    section_header("📈 Metric Trends Over Time")
    if not selected_metrics:
        st.info("Select at least one metric in the sidebar.")
    else:
        ts_col, pie_col = st.columns([1.6, 1], gap="large")
        with ts_col:
            st.plotly_chart(_timeseries_chart(df, country, selected_metrics), use_container_width=True)
        with pie_col:
            st.plotly_chart(_sector_pie(df, country), use_container_width=True)

    # ── Comparison mode ───────────────────────────────────────────────────────
    if compare_mode:
        section_header(f"⚖️ {country} vs {compare_country}")
        st.plotly_chart(_comparison_chart(df, country, compare_country, compare_metric), use_container_width=True)

        # Data table comparison
        st.markdown("**Side-by-side data (2020–2024)**")
        col_id = METRICS[compare_metric][0]
        d1 = df[(df["country"] == country) & (df["year"] >= 2020)][["year", col_id]].rename(columns={col_id: country})
        d2 = df[(df["country"] == compare_country) & (df["year"] >= 2020)][["year", col_id]].rename(columns={col_id: compare_country})
        merged = d1.merge(d2, on="year").set_index("year")
        st.dataframe(merged.style.format("{:,.2f}"), use_container_width=True)

    # ── Raw data expander ─────────────────────────────────────────────────────
    with st.expander(f"📄 Raw data for {country}"):
        cdf = df[df["country"] == country].sort_values("year", ascending=False)
        st.dataframe(cdf.reset_index(drop=True), use_container_width=True)
