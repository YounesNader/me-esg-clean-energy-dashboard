"""
streamlit_app/pages/overview.py
---------------------------------
🏠 Overview page — headline KPIs, geographic bubble map, and budget comparison bar chart.
"""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from utils import (
    COUNTRY_COORDS, COUNTRY_ORDER, PALETTE, PLOTLY_TEMPLATE,
    apply_chart_defaults, kpi_card, section_header,
)


def render() -> None:
    df: pd.DataFrame = st.session_state["df"]

    # ── Page header ───────────────────────────────────────────────────────────
    st.markdown(
        """
        <h1 style='color:#17A398; font-size:2rem; margin-bottom:0.1rem;'>
            Middle East ESG &amp; Clean Energy Budget Dashboard
        </h1>
        <p style='color:#8B949E; font-size:0.97rem; margin-top:0;'>
            Tracking sovereign and corporate clean energy investment across 8 Middle Eastern
            countries from 2015 to 2024, with Prophet-based forecasts through 2030.
        </p>
        <hr style='border-color:#21262D; margin:0.8rem 0 1.2rem;'/>
        """,
        unsafe_allow_html=True,
    )

    # ── KPI Calculations ──────────────────────────────────────────────────────
    total_esg       = df["esg_budget_usd_million"].sum()
    avg_esg_score   = df[df["year"] == 2024]["esg_score"].mean()
    top_country_row = df[df["year"] == 2024].sort_values("esg_budget_usd_million", ascending=False).iloc[0]
    fastest_row     = df[df["year"] == 2024].sort_values("yoy_growth", ascending=False).iloc[0]

    # ── KPI Cards ─────────────────────────────────────────────────────────────
    section_header("📌 Key Performance Indicators — 2024")
    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(
            kpi_card(
                "Total ESG Investment",
                f"${total_esg / 1000:,.1f}B",
                "All countries · 2015–2024"
            ),
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            kpi_card(
                "Avg ESG Score",
                f"{avg_esg_score:.1f} / 100",
                "Regional average · 2024"
            ),
            unsafe_allow_html=True,
        )
    with c3:
        st.markdown(
            kpi_card(
                "Top Investor (2024)",
                top_country_row["country"],
                f"${top_country_row['esg_budget_usd_million']:,.0f}M budget"
            ),
            unsafe_allow_html=True,
        )
    with c4:
        st.markdown(
            kpi_card(
                "Fastest Growing (2024)",
                fastest_row["country"],
                f"+{fastest_row['yoy_growth']:.1f}% YoY"
            ),
            unsafe_allow_html=True,
        )

    st.markdown("<br/>", unsafe_allow_html=True)

    # ── Map + Bar chart side by side ──────────────────────────────────────────
    section_header("🗺️ Geographic Investment Distribution — 2024")
    map_col, bar_col = st.columns([1.35, 1], gap="large")

    with map_col:
        df_2024 = df[df["year"] == 2024].copy()
        df_2024["lat"] = df_2024["country"].map(lambda c: COUNTRY_COORDS.get(c, (0, 0))[0])
        df_2024["lon"] = df_2024["country"].map(lambda c: COUNTRY_COORDS.get(c, (0, 0))[1])
        df_2024["bubble_size"] = df_2024["esg_budget_usd_million"] ** 0.52  # sqrt-ish scaling

        fig_map = px.scatter_geo(
            df_2024,
            lat="lat",
            lon="lon",
            size="bubble_size",
            color="esg_budget_usd_million",
            hover_name="country",
            hover_data={
                "esg_budget_usd_million": ":,.0f",
                "esg_score": ":.1f",
                "bubble_size": False,
                "lat": False,
                "lon": False,
            },
            color_continuous_scale=[
                [0.0, "#1C2128"],
                [0.3, "#006D77"],
                [0.7, "#17A398"],
                [1.0, "#2DC5A2"],
            ],
            size_max=55,
            labels={"esg_budget_usd_million": "ESG Budget (USD M)"},
            title="ESG Budget by Country — 2024 (bubble = budget size)",
        )
        fig_map.update_geos(
            scope="asia",
            center={"lat": 26, "lon": 48},
            projection_scale=3.5,
            bgcolor="rgba(0,0,0,0)",
            showland=True,
            landcolor="#1C2128",
            showocean=True,
            oceancolor="#0D1117",
            showcoastlines=True,
            coastlinecolor="#21262D",
            showframe=False,
            showcountries=True,
            countrycolor="#21262D",
        )
        fig_map.update_layout(
            template=PLOTLY_TEMPLATE,
            paper_bgcolor="rgba(0,0,0,0)",
            coloraxis_colorbar=dict(
                title=dict(text="USD M", font=dict(color="#8B949E")),
                tickfont=dict(color="#8B949E"),
            ),
            margin=dict(l=0, r=0, t=40, b=0),
            height=400,
        )
        st.plotly_chart(fig_map, use_container_width=True)

    with bar_col:
        df_bar = (
            df[df["year"] == 2024]
            .sort_values("esg_budget_usd_million", ascending=True)
        )
        fig_bar = go.Figure(
            go.Bar(
                x=df_bar["esg_budget_usd_million"],
                y=df_bar["country"],
                orientation="h",
                marker=dict(
                    color=[PALETTE.get(c, "#17A398") for c in df_bar["country"]],
                    line=dict(color="rgba(0,0,0,0)", width=0),
                ),
                text=df_bar["esg_budget_usd_million"].apply(lambda v: f"${v:,.0f}M"),
                textposition="outside",
                textfont=dict(size=11, color="#C9D1D9"),
                hovertemplate="<b>%{y}</b><br>ESG Budget: $%{x:,.0f}M<extra></extra>",
            )
        )
        fig_bar.update_layout(
            title="ESG Budget Ranking — 2024",
            xaxis_title="ESG Budget (USD Million)",
            xaxis=dict(range=[0, df_bar["esg_budget_usd_million"].max() * 1.22]),
        )
        apply_chart_defaults(fig_bar, height=400)
        st.plotly_chart(fig_bar, use_container_width=True)

    # ── Trend sparkline — all countries ──────────────────────────────────────
    section_header("📈 ESG Budget Trajectories — 2015 to 2024")
    st.caption("Hover over any line for exact values. The COP26 inflection point (2021) is marked.")

    fig_trend = px.line(
        df.sort_values("year"),
        x="year", y="esg_budget_usd_million",
        color="country",
        color_discrete_map=PALETTE,
        markers=True,
        labels={
            "esg_budget_usd_million": "ESG Budget (USD M)",
            "year": "Year",
            "country": "Country",
        },
        hover_data={"esg_budget_usd_million": ":,.0f"},
    )
    # COP26 vertical line
    fig_trend.add_vline(
        x=2021, line_dash="dot", line_color="#E63946", line_width=1.5,
        annotation_text="COP26", annotation_position="top right",
        annotation_font=dict(color="#E63946", size=11),
    )
    fig_trend.update_traces(line_width=2.2, marker_size=5)
    apply_chart_defaults(fig_trend, height=400)
    fig_trend.update_layout(
        yaxis_tickprefix="$", yaxis_ticksuffix="M",
        hovermode="x unified",
        xaxis=dict(dtick=1),
    )
    st.plotly_chart(fig_trend, use_container_width=True)
