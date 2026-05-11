"""
streamlit_app/app.py
---------------------
Entry point — run with:
    streamlit run streamlit_app/app.py

Uses st.sidebar radio for multi-page navigation so the app works on
both Streamlit Community Cloud and local installs without extra config.
"""

import sys
from pathlib import Path

import streamlit as st

# ── Make project root importable ──────────────────────────────────────────────
ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "pages"))

from utils import GLOBAL_CSS, load_clean, load_forecasts

# ── Page config (must be first Streamlit call) ────────────────────────────────
st.set_page_config(
    page_title="ME ESG Dashboard",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Inject global CSS ─────────────────────────────────────────────────────────
st.markdown(GLOBAL_CSS, unsafe_allow_html=True)

# ── Pre-load data into session_state once ─────────────────────────────────────
if "df" not in st.session_state:
    st.session_state["df"]        = load_clean()
    st.session_state["forecasts"] = load_forecasts()

# ── Sidebar navigation ────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(
        """
        <div style='text-align:center; padding: 0.5rem 0 1rem;'>
            <span style='font-size:2rem;'>🌿</span><br/>
            <span style='font-size:1.05rem; font-weight:700; color:#17A398;'>ME ESG Dashboard</span><br/>
            <span style='font-size:0.72rem; color:#6E7681;'>Middle East Clean Energy Analytics</span>
        </div>
        """,
        unsafe_allow_html=True,
    )

    page = st.radio(
        "Navigation",
        options=[
            "🏠 Overview",
            "📊 Country Deep Dive",
            "🔮 Forecasting",
            "🌿 ESG Score Analysis",
            "ℹ️ About & Methodology",
        ],
        label_visibility="collapsed",
    )

    st.markdown("<br/>", unsafe_allow_html=True)
    st.markdown(
        "<div style='font-size:0.7rem; color:#444D56; text-align:center;'>"
        "Data: 2015–2024 | Forecast: 2025–2030<br/>"
        "8 Countries · 5 Sectors</div>",
        unsafe_allow_html=True,
    )

# ── Route to pages ────────────────────────────────────────────────────────────
if page == "🏠 Overview":
    from pages.overview import render
    render()
elif page == "📊 Country Deep Dive":
    from pages.country_deep_dive import render
    render()
elif page == "🔮 Forecasting":
    from pages.forecasting import render
    render()
elif page == "🌿 ESG Score Analysis":
    from pages.esg_analysis import render
    render()
elif page == "ℹ️ About & Methodology":
    from pages.about import render
    render()
