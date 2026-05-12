"""
streamlit_app/esg_analysis.py
-------------------------------
🌿 ESG Score Analysis page — score distributions, policy vs budget scatter,
correlation heatmap, and regional ranking table.
"""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from utils import (
    COUNTRY_ORDER, PALETTE, SECTOR_PALETTE,
    apply_chart_defaults, kpi_card, section_header,
)


def render() -> None:
    df: pd.DataFrame = st.session_state["df"]

    st.markdown(
        "<h2 style='color:#00d4aa; font-size:1.6rem; margin-bottom:0.2rem;'>"
        "🌿 ESG Score Analysis</h2>"
        "<p style='color:#475569; font-size:0.85rem; margin-top:0;'>"
        "Composite ESG scores, policy drivers, and sector-level breakdowns</p>",
        unsafe_allow_html=True,
    )

    # ── Region-wide KPIs ──────────────────────────────────────────────────────
    section_header("Regional Snapshot")
    avg_esg = df["esg_score"].mean() if "esg_score" in df.columns else None
    avg_policy = df["policy_index"].mean() if "policy_index" in df.columns else None
    avg_re = df["renewable_energy_pct"].mean() if "renewable_energy_pct" in df.columns else None

    c1, c2, c3 = st.columns(3)
    with c1:
        if avg_esg is not None:
            st.markdown(kpi_card("Avg ESG Score", f"{avg_esg:.1f}", "2015–2024 mean"),
                        unsafe_allow_html=True)
    with c2:
        if avg_policy is not None:
            st.markdown(kpi_card("Avg Policy Index", f"{avg_policy:.1f}", "Regulatory strength"),
                        unsafe_allow_html=True)
    with c3:
        if avg_re is not None:
            st.markdown(kpi_card("Avg RE Share", f"{avg_re:.1f}%", "Of total energy mix", "#3b82f6"),
                        unsafe_allow_html=True)

    # ── ESG score over time by country ────────────────────────────────────────
    if "esg_score" in df.columns:
        section_header("ESG Score Trend by Country")
        trend = df.groupby(["year", "country"])["esg_score"].mean().reset_index()
        fig = px.line(
            trend, x="year", y="esg_score", color="country",
            color_discrete_map=PALETTE,
        )
        apply_chart_defaults(fig, height=380)
        fig.update_traces(line_width=2)
        st.plotly_chart(fig, use_container_width=True)

    # ── Policy index vs ESG budget scatter ───────────────────────────────────
    if "policy_index" in df.columns and "esg_budget_usd_million" in df.columns:
        section_header("Policy Index vs ESG Budget")
        scatter_df = df.groupby("country").agg(
            policy_index=("policy_index", "mean"),
            esg_budget=("esg_budget_usd_million", "sum"),
            esg_score=("esg_score", "mean") if "esg_score" in df.columns else ("esg_budget_usd_million", "count"),
        ).reset_index()

        fig2 = px.scatter(
            scatter_df,
            x="policy_index", y="esg_budget",
            size="esg_score", color="country",
            color_discrete_map=PALETTE,
            text="country",
            hover_data={"policy_index": ":.1f", "esg_budget": ":,.0f"},
        )
        fig2.update_traces(textposition="top center", textfont_size=10)
        apply_chart_defaults(fig2, height=400)
        fig2.update_layout(xaxis_title="Policy Index", yaxis_title="Total ESG Budget (USD M)")
        st.plotly_chart(fig2, use_container_width=True)

    # ── Country ranking table ─────────────────────────────────────────────────
    section_header("Country ESG Rankings")
    rank_cols = [c for c in ["esg_score", "policy_index", "renewable_energy_pct",
                              "esg_budget_usd_million", "co2_reduction_mt"] if c in df.columns]
    if rank_cols:
        ranking = df.groupby("country")[rank_cols].mean().reset_index()
        ranking = ranking.sort_values(rank_cols[0], ascending=False).reset_index(drop=True)
        ranking.index += 1
        ranking.columns = [c.replace("_", " ").title() for c in ranking.columns]
        st.dataframe(
            ranking.style.format({c: "{:.1f}" for c in ranking.columns if c != "Country"}),
            use_container_width=True,
            height=320,
        )

    # ── Sector contribution to RE investment ─────────────────────────────────
    if "sector" in df.columns and "re_investment_usd_million" in df.columns:
        section_header("RE Investment by Sector")
        sector_df = df.groupby("sector")["re_investment_usd_million"].sum().reset_index()
        fig3 = px.bar(
            sector_df.sort_values("re_investment_usd_million"),
            x="re_investment_usd_million", y="sector",
            orientation="h",
            color="sector",
            color_discrete_map=SECTOR_PALETTE,
        )
        apply_chart_defaults(fig3, height=320)
        fig3.update_layout(showlegend=False, xaxis_title="USD Million", yaxis_title=None)
        st.plotly_chart(fig3, use_container_width=True)
