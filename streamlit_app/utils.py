"""
streamlit_app/utils.py
-----------------------
Shared helpers: data loading (cached), colour palette, CSS injection,
and reusable chart builders used across all pages.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT          = Path(__file__).parents[1]
CLEAN_CSV     = ROOT / "data/processed/me_esg_clean.csv"
FORECASTS_CSV = ROOT / "data/processed/forecasts.csv"

# ── Country metadata ──────────────────────────────────────────────────────────
COUNTRY_COORDS: dict[str, tuple[float, float]] = {
    "Saudi Arabia": (24.0,  45.0),
    "UAE":          (24.0,  54.0),
    "Qatar":        (25.3,  51.2),
    "Kuwait":       (29.3,  47.7),
    "Oman":         (22.0,  58.0),
    "Bahrain":      (26.0,  50.6),
    "Jordan":       (31.0,  36.0),
    "Egypt":        (26.0,  30.0),
}

COUNTRY_ORDER = [
    "Saudi Arabia", "UAE", "Qatar", "Kuwait",
    "Oman", "Egypt", "Bahrain", "Jordan",
]

# ── Matching the React frontend palette ───────────────────────────────────────
PALETTE: dict[str, str] = {
    "Saudi Arabia": "#00d4aa",
    "UAE":          "#3b82f6",
    "Qatar":        "#10b981",
    "Kuwait":       "#a78bfa",
    "Oman":         "#fb923c",
    "Egypt":        "#fbbf24",
    "Bahrain":      "#f472b6",
    "Jordan":       "#86efac",
}

SECTOR_PALETTE: dict[str, str] = {
    "Solar":              "#fbbf24",
    "Wind":               "#00d4aa",
    "Hydrogen":           "#3b82f6",
    "Grid Infrastructure":"#a78bfa",
    "Carbon Capture":     "#fb923c",
}

PLOTLY_TEMPLATE = "plotly_dark"

BG_BASE    = "#0a0a0f"
BG_CARD    = "#16161f"
BG_RAISED  = "#1c1c28"
BORDER_CLR = "rgba(255,255,255,0.06)"
TEAL       = "#00d4aa"

# ── Data loading ──────────────────────────────────────────────────────────────
@st.cache_data
def load_clean() -> pd.DataFrame:
    return pd.read_csv(CLEAN_CSV)

@st.cache_data
def load_forecasts() -> pd.DataFrame:
    if FORECASTS_CSV.exists():
        return pd.read_csv(FORECASTS_CSV)
    return pd.DataFrame()

# ── Global CSS ────────────────────────────────────────────────────────────────
GLOBAL_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

html, body, [class*="css"] {
    font-family: 'IBM Plex Sans', system-ui, sans-serif !important;
    background-color: #0a0a0f !important;
}

.block-container { padding-top: 1.5rem; padding-bottom: 2rem; }
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0e0e16 0%, #0a0a0f 100%) !important;
    border-right: 1px solid rgba(255,255,255,0.06) !important;
}

/* KPI cards */
.kpi-card {
    background: #16161f;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 1.1rem 1.3rem;
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.18s;
}
.kpi-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #00d4aa, transparent 70%);
}
.kpi-card:hover {
    border-color: rgba(0,212,170,0.28);
    transform: translateY(-2px);
}
.kpi-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 0.4rem;
}
.kpi-value {
    font-size: 1.85rem;
    font-weight: 700;
    font-family: 'IBM Plex Mono', monospace;
    color: #00d4aa;
    line-height: 1.15;
}
.kpi-sub {
    font-size: 0.72rem;
    color: #475569;
    margin-top: 0.25rem;
}

/* Section headers */
.section-header {
    font-size: 0.85rem;
    font-weight: 700;
    color: #00d4aa;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(0,212,170,0.15);
    padding-bottom: 0.4rem;
    margin: 1.4rem 0 1rem;
}

/* Badge pills */
.badge {
    display: inline-block;
    background: rgba(0,212,170,0.08);
    border: 1px solid rgba(0,212,170,0.25);
    border-radius: 20px;
    padding: 0.2rem 0.8rem;
    font-size: 0.78rem;
    font-weight: 500;
    color: #00d4aa;
    margin: 0.2rem;
}
.badge-blue  { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.25); color: #3b82f6; }
.badge-amber { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.25); color: #f59e0b; }

/* Insight box */
.insight-box {
    background: rgba(0,212,170,0.05);
    border-left: 3px solid #00d4aa;
    border-radius: 0 8px 8px 0;
    padding: 0.9rem 1.1rem;
    margin: 0.6rem 0;
    color: #94a3b8;
    font-size: 0.88rem;
    line-height: 1.6;
}
.insight-number {
    font-size: 1.2rem;
    font-weight: 700;
    font-family: 'IBM Plex Mono', monospace;
    color: #00d4aa;
    margin-right: 0.4rem;
}

/* Scrollbar */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,212,170,0.2); border-radius: 3px; }
</style>
"""


def kpi_card(label: str, value: str, sub: str = "", color: str = "#00d4aa") -> str:
    sub_html = f'<div class="kpi-sub">{sub}</div>' if sub else ""
    return f"""
    <div class="kpi-card">
        <div class="kpi-label">{label}</div>
        <div class="kpi-value" style="color:{color}">{value}</div>
        {sub_html}
    </div>"""


def section_header(title: str) -> None:
    st.markdown(f'<div class="section-header">{title}</div>', unsafe_allow_html=True)


def apply_chart_defaults(fig: go.Figure, height: int = 420, title: str = "") -> go.Figure:
    """Apply consistent dark-terminal layout to every Plotly figure."""
    fig.update_layout(
        template=PLOTLY_TEMPLATE,
        height=height,
        title=dict(
            text=title,
            font=dict(size=13, color="#94a3b8", family="IBM Plex Sans"),
        ) if title else None,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(22,22,31,0.6)",
        font=dict(family="IBM Plex Sans, sans-serif", color="#94a3b8", size=11),
        legend=dict(
            bgcolor="rgba(22,22,31,0.9)",
            bordercolor="rgba(255,255,255,0.08)",
            borderwidth=1,
            font=dict(size=11, color="#94a3b8"),
        ),
        margin=dict(l=12, r=12, t=40 if title else 12, b=12),
        hoverlabel=dict(
            bgcolor="#16161f",
            bordercolor="rgba(0,212,170,0.3)",
            font=dict(family="IBM Plex Mono, monospace", size=11, color="#f1f5f9"),
        ),
    )
    fig.update_xaxes(
        gridcolor="rgba(255,255,255,0.04)",
        zerolinecolor="rgba(255,255,255,0.08)",
        tickfont=dict(family="IBM Plex Mono", size=10, color="#475569"),
    )
    fig.update_yaxes(
        gridcolor="rgba(255,255,255,0.04)",
        zerolinecolor="rgba(255,255,255,0.08)",
        tickfont=dict(family="IBM Plex Mono", size=10, color="#475569"),
    )
    return fig
