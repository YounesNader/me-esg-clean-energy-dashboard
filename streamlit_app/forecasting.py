"""
streamlit_app/forecasting.py
------------------------------
🔮 Forecasting page — Prophet-based budget forecasts per country with
scenario bands and model performance metrics.
"""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from utils import (
    COUNTRY_ORDER, PALETTE,
    apply_chart_defaults, kpi_card, section_header,
)


def render() -> None:
    df: pd.DataFrame = st.session_state["df"]
    forecasts: pd.DataFrame = st.session_state["forecasts"]

    st.markdown(
        "<h2 style='color:#00d4aa; font-size:1.6rem; margin-bottom:0.2rem;'>"
        "🔮 Budget Forecasting · 2025–2030</h2>"
        "<p style='color:#475569; font-size:0.85rem; margin-top:0;'>"
        "Prophet ML + Ridge Regression ensemble · 95 % confidence bands</p>",
        unsafe_allow_html=True,
    )

    if forecasts.empty:
        st.warning("Forecast data not available. Run `python backend/generate_forecasts.py` to generate it.")
        return

    # ── Country selector ──────────────────────────────────────────────────────
    countries = [c for c in COUNTRY_ORDER if c in forecasts["country"].unique()]
    country = st.selectbox("Select country", countries)

    fc = forecasts[forecasts["country"] == country].sort_values("year")
    hist = df[df["country"] == country].groupby("year")["esg_budget_usd_million"].sum().reset_index()

    section_header("Budget Trajectory & Forecast")

    fig = go.Figure()

    # Historical
    fig.add_trace(go.Scatter(
        x=hist["year"], y=hist["esg_budget_usd_million"],
        mode="lines+markers",
        name="Historical",
        line=dict(color=PALETTE.get(country, "#00d4aa"), width=2),
        marker=dict(size=5),
    ))

    if not fc.empty and "predicted_budget" in fc.columns:
        # Confidence band
        if "upper_bound" in fc.columns and "lower_bound" in fc.columns:
            fig.add_trace(go.Scatter(
                x=pd.concat([fc["year"], fc["year"].iloc[::-1]]),
                y=pd.concat([fc["upper_bound"], fc["lower_bound"].iloc[::-1]]),
                fill="toself",
                fillcolor="rgba(0,212,170,0.08)",
                line=dict(color="rgba(0,212,170,0)"),
                name="95% CI",
                hoverinfo="skip",
            ))

        # Forecast line
        fig.add_trace(go.Scatter(
            x=fc["year"], y=fc["predicted_budget"],
            mode="lines+markers",
            name="Forecast",
            line=dict(color="#00d4aa", width=2, dash="dot"),
            marker=dict(size=5, symbol="diamond"),
        ))

    # TODAY line
    fig.add_vline(x=2025, line_dash="dash", line_color="rgba(255,255,255,0.2)",
                  annotation_text="TODAY", annotation_font_size=10,
                  annotation_font_color="#475569")

    apply_chart_defaults(fig, height=400)
    st.plotly_chart(fig, use_container_width=True)

    # ── Scenario KPIs ─────────────────────────────────────────────────────────
    if not fc.empty and "predicted_budget" in fc.columns:
        last = fc.iloc[-1]
        section_header("2030 Scenario Estimates")
        c1, c2, c3 = st.columns(3)
        bear = last.get("lower_bound", last["predicted_budget"] * 0.85)
        base = last["predicted_budget"]
        bull = last.get("upper_bound", last["predicted_budget"] * 1.15)

        with c1:
            st.markdown(kpi_card("Bear Case", f"${bear:,.0f}M", "Lower 95% CI", "#fb923c"),
                        unsafe_allow_html=True)
        with c2:
            st.markdown(kpi_card("Base Case", f"${base:,.0f}M", "Predicted", "#00d4aa"),
                        unsafe_allow_html=True)
        with c3:
            st.markdown(kpi_card("Bull Case", f"${bull:,.0f}M", "Upper 95% CI", "#3b82f6"),
                        unsafe_allow_html=True)

    # ── All-country 2030 comparison ───────────────────────────────────────────
    section_header("2030 Projected Budgets — All Countries")
    last_year = forecasts[forecasts["year"] == forecasts["year"].max()].copy()
    last_year = last_year.sort_values("predicted_budget", ascending=True)

    fig2 = go.Figure(go.Bar(
        x=last_year["predicted_budget"],
        y=last_year["country"],
        orientation="h",
        marker_color=[PALETTE.get(c, "#00d4aa") for c in last_year["country"]],
        marker_opacity=0.85,
    ))
    apply_chart_defaults(fig2, height=320)
    fig2.update_layout(xaxis_title="USD Million", yaxis_title=None)
    st.plotly_chart(fig2, use_container_width=True)
