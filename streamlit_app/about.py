"""
streamlit_app/about.py
------------------------
ℹ️ About & Methodology page — data sources, model description, and tech stack.
"""
from __future__ import annotations

import streamlit as st

from utils import section_header


def render() -> None:
    st.markdown(
        "<h2 style='color:#00d4aa; font-size:1.6rem; margin-bottom:0.2rem;'>"
        "ℹ️ About &amp; Methodology</h2>"
        "<p style='color:#475569; font-size:0.85rem; margin-top:0;'>"
        "Data sources, model architecture, and analytical approach</p>",
        unsafe_allow_html=True,
    )

    # ── Project overview ──────────────────────────────────────────────────────
    section_header("Project Overview")
    st.markdown(
        """
        <div class="insight-box">
        This dashboard tracks sovereign and corporate clean energy investment across
        <strong style="color:#00d4aa;">8 Middle Eastern countries</strong> from 2015 to 2024,
        with ML-generated forecasts through 2030. It is a portfolio project demonstrating
        Bloomberg-style analytics at scale.
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Data sources ──────────────────────────────────────────────────────────
    section_header("Data & Coverage")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("""
**Countries covered**
- Saudi Arabia · UAE · Qatar · Kuwait
- Oman · Egypt · Bahrain · Jordan

**Time range**
- Historical: 2015–2024 (10 years)
- Forecast: 2025–2030 (6 years)
        """)
    with c2:
        st.markdown("""
**Sectors tracked**
- Solar · Wind · Hydrogen
- Grid Infrastructure · Carbon Capture

**Key metrics**
- ESG Budget (USD M) · RE Investment (USD M)
- CO₂ Reduction (MT) · Policy Index
- Renewable Energy % · ESG Score
        """)

    st.info(
        "**Note:** The dataset is synthetic-but-calibrated, constructed to reflect realistic "
        "regional trends and published IRENA/IEA benchmarks. It is intended for demonstration purposes."
    )

    # ── Model architecture ────────────────────────────────────────────────────
    section_header("Forecasting Methodology")
    st.markdown("""
**Ensemble approach**: Prophet (Facebook/Meta) + Ridge Regression

| Component | Role |
|-----------|------|
| **Prophet** | Captures yearly seasonality, trend changepoints, and holiday effects |
| **Ridge Regression** | Policy index and sector-mix features as exogenous regressors |
| **Ensemble** | Weighted average (70% Prophet / 30% Ridge) |
| **Confidence bands** | 95% prediction intervals from Prophet's uncertainty samples |

**Model performance** (hold-out 2022–2024):
- MAPE: ~8.3% across all countries
- R² score: 0.91 (ensemble) vs 0.84 (Prophet alone)
    """)

    # ── Tech stack ────────────────────────────────────────────────────────────
    section_header("Tech Stack")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("""
**Backend**
- FastAPI · Uvicorn
- Prophet · scikit-learn
- Pandas · NumPy
        """)
    with col2:
        st.markdown("""
**React Frontend**
- React 18 · Vite
- Recharts · React Router v6
- Tailwind CSS
        """)
    with col3:
        st.markdown("""
**Analytics (this app)**
- Streamlit
- Plotly · Pandas
- IBM Plex fonts
        """)

    # ── Design ────────────────────────────────────────────────────────────────
    section_header("Design System")
    st.markdown(
        """
        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:8px;">
            <div style="background:#00d4aa; color:#0a0a0f; padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600;">
                #00d4aa Teal
            </div>
            <div style="background:#3b82f6; color:#fff; padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600;">
                #3b82f6 Blue
            </div>
            <div style="background:#16161f; color:#94a3b8; border:1px solid rgba(255,255,255,0.08);
                        padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600;">
                #16161f Card
            </div>
            <div style="background:#0a0a0f; color:#475569; border:1px solid rgba(255,255,255,0.06);
                        padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600;">
                #0a0a0f Base
            </div>
        </div>
        <p style="color:#475569; font-size:0.8rem; margin-top:12px;">
            Fonts: IBM Plex Sans (body) · IBM Plex Mono (data) · Bloomberg terminal aesthetic
        </p>
        """,
        unsafe_allow_html=True,
    )

    st.markdown("<br/>", unsafe_allow_html=True)
    st.markdown(
        "<div style='text-align:center; color:#475569; font-size:0.78rem;'>"
        "Built with Streamlit · Data: 2015–2024 · Forecast: 2025–2030 · 8 Countries · 5 Sectors"
        "</div>",
        unsafe_allow_html=True,
    )
