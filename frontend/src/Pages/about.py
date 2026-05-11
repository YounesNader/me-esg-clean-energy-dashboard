"""
streamlit_app/pages/about.py
------------------------------
ℹ️ About & Methodology — project background, data dictionary,
model choices, and tech stack.
"""
from __future__ import annotations

import streamlit as st

from utils import section_header


TECH_STACK = [
    ("🐍 Python 3.11",         "Core language"),
    ("🐼 Pandas",               "Data wrangling & transformation"),
    ("🔢 NumPy",                "Numerical computing"),
    ("📊 Plotly",               "Interactive charts & animations"),
    ("🤖 Scikit-learn",         "Ridge Regression & Random Forest"),
    ("🔮 Prophet (Meta)",       "Time-series forecasting"),
    ("⚡ FastAPI",              "REST API backend"),
    ("🌐 Streamlit",            "This dashboard"),
    ("🗂️ Joblib",               "Model serialisation"),
    ("📐 SciPy",                "Statistical tests & OLS regression"),
]

DATA_DICT = [
    ("country",                          "string",  "One of 8 ME countries"),
    ("year",                             "int",     "Annual observation: 2015–2024"),
    ("esg_budget_usd_million",           "float",   "Total ESG-related government/corporate budget (USD M)"),
    ("renewable_energy_investment_usd_million", "float", "Clean energy capital deployed (USD M)"),
    ("solar_capacity_mw",                "float",   "Installed utility-scale solar capacity (MW)"),
    ("wind_capacity_mw",                 "float",   "Installed wind capacity (MW)"),
    ("carbon_emissions_mt",              "float",   "Total CO₂-equivalent emissions (metric tons, millions)"),
    ("esg_score",                        "float",   "Composite ESG score 0–100 (higher = better)"),
    ("gdp_usd_billion",                  "float",   "Nominal GDP (USD billion)"),
    ("oil_revenue_usd_billion",          "float",   "Hydrocarbon export revenues (USD billion)"),
    ("population_million",               "float",   "Total population (millions)"),
    ("policy_index",                     "float",   "Regulatory clean energy policy strength (0–10)"),
    ("green_bonds_issued_usd_million",   "float",   "Sovereign/corporate green bond issuances (USD M)"),
    ("sector",                           "string",  "Primary clean energy focus: Solar / Wind / Hydrogen / Grid Infrastructure / Carbon Capture"),
    ("esg_budget_per_gdp",               "float",   "ESG budget as % of GDP — normalised cross-country comparator"),
    ("yoy_growth",                       "float",   "Year-over-year % change in ESG budget per country"),
    ("investment_efficiency",            "float",   "Renewable investment ÷ carbon emissions — impact per dollar"),
]


def render() -> None:
    st.markdown(
        "<h1 style='color:#17A398; font-size:1.9rem;'>ℹ️ About This Project</h1>",
        unsafe_allow_html=True,
    )

    # ── Project description ───────────────────────────────────────────────────
    section_header("🌍 Why Middle East Clean Energy?")
    st.markdown("""
The Middle East is simultaneously the world's largest hydrocarbon exporter and one of the
regions most physically exposed to climate change — temperatures are projected to increase
**2–4°C above the global mean** by 2050, threatening water security, habitability, and
agricultural viability across the Gulf, Levant, and North Africa.

This tension has forced a structural policy shift. Sovereign wealth funds like Saudi
Arabia's **Public Investment Fund** (>$700B AUM) and Abu Dhabi's **Mubadala** have
committed hundreds of billions to clean energy transition. National visions —
**Saudi Vision 2030**, **UAE Net Zero 2050**, **Qatar National Vision 2030** — have
embedded ESG targets into state planning at the highest level.

This dashboard tracks that transition: where the capital is going, how quickly it is
growing, which policy environments are most effective, and where the region will likely
be by 2030.
    """)

    # ── Data section ──────────────────────────────────────────────────────────
    section_header("📁 Dataset")
    st.markdown("""
**Source:** Synthetic dataset generated via `generate_data.py` using calibrated base
parameters drawn from public sources (World Bank, IEA, regional national budgets).
Realistic noise is applied multiplicatively so variance scales with magnitude.

**Coverage:** 8 countries × 10 years (2015–2024) = 80 annual observations.

**Data cleaning** is handled by `ESGDataLoader`:
- Column names normalised to `snake_case`
- Missing values forward-filled within each country group (never across countries)
- Three derived features engineered: `esg_budget_per_gdp`, `yoy_growth`, `investment_efficiency`
    """)

    st.markdown("**Column dictionary:**")
    col_headers = ["Column", "Type", "Description"]
    col1, col2, col3 = st.columns([2, 0.8, 4])
    col1.markdown(f"**{col_headers[0]}**")
    col2.markdown(f"**{col_headers[1]}**")
    col3.markdown(f"**{col_headers[2]}**")
    st.markdown("<hr style='border-color:#21262D; margin:0.2rem 0 0.5rem;'/>", unsafe_allow_html=True)

    for col_name, dtype, desc in DATA_DICT:
        c1, c2, c3 = st.columns([2, 0.8, 4])
        c1.markdown(f"`{col_name}`")
        c2.markdown(f"<span style='color:#8B949E;'>{dtype}</span>", unsafe_allow_html=True)
        c3.markdown(desc)

    # ── Model section ─────────────────────────────────────────────────────────
    section_header("🤖 ML Models")

    tab1, tab2, tab3 = st.tabs(["Ridge vs Random Forest", "Prophet Forecasting", "Feature Engineering"])

    with tab1:
        st.markdown("""
**Task:** Predict `esg_budget_usd_million` for held-out years 2022–2024 (trained on 2015–2021).

| Model | RMSE | MAE | R² | Notes |
|---|---|---|---|---|
| **Ridge Regression** ✅ | 1,317 | 822 | 0.862 | Winner — lower RMSE |
| Random Forest | 2,099 | 1,192 | 0.649 | Overfits on 40-row train set |

**Why Ridge won:** With only 40 training rows (8 countries × 5 years after lag-feature
dropout) and highly correlated features, the Random Forest overfits to training signal.
Ridge Regression's L2 penalty handles multicollinearity cleanly and generalises better
on the small panel.

**Why RMSE as the selection criterion:** RMSE penalises large individual country errors
more heavily than MAE — important for a dashboard where a single outlier country (e.g.
Saudi Arabia's volatile budget) matters to the end user.
        """)

    with tab2:
        st.markdown("""
**Facebook Prophet** is a decomposable time-series model that separates trend, seasonality,
and external regressors. Key advantages for ESG forecasting:

- **Automatic changepoint detection** — captures the COP26 structural break in 2021
  without manual intervention, unlike ARIMA which requires differencing and stationarity.
- **External regressors** — GDP, Policy Index, and Oil Revenue are added as additional
  signal. Higher GDP economies tend to commit more in absolute terms; stronger policy
  drives spending.
- **Per-country models** — one model per country respects the heterogeneous trajectories
  (Saudi Arabia ≠ Jordan) that a single panel model would average away.
- **Credible intervals** — 80% confidence bands quantify uncertainty rather than
  pretending the future is a single point estimate.

**Regressor projection:** GDP, Policy Index, and Oil Revenue for 2025–2030 are
linearly extrapolated from the last 3 observed years. In a production system, these
would be replaced with IMF World Economic Outlook projections.
        """)

    with tab3:
        st.markdown("""
Five features were engineered for the sklearn models, all computed **within country groups**
to prevent cross-border data leakage:

| Feature | Description | Signal |
|---|---|---|
| `lag_1_budget` | Prior year ESG budget | Momentum — budgets persist |
| `lag_2_budget` | 2-year prior budget | Slower momentum signal |
| `rolling_3yr_avg` | 3-year rolling mean of budget | Smoothed trend baseline |
| `policy_x_gdp` | Policy Index × GDP | Amplifying effect of strong policy in large economies |
| `oil_dependency_ratio` | Oil revenue / GDP | Captures hydrocarbon-dependence context |

The lag features create a 16-row dropout (first 2 years per country) — a known tradeoff
between feature richness and sample size.
        """)

    # ── Tech stack ────────────────────────────────────────────────────────────
    section_header("🛠️ Tech Stack")

    badges_html = " ".join([
        f'<span class="badge">{name}</span>'
        for name, _ in TECH_STACK
    ])
    st.markdown(f'<div style="margin-bottom:1rem;">{badges_html}</div>', unsafe_allow_html=True)

    col1, col2 = st.columns(2)
    for i, (name, desc) in enumerate(TECH_STACK):
        target = col1 if i % 2 == 0 else col2
        target.markdown(
            f"<div style='font-size:0.9rem; padding:0.2rem 0;'>"
            f"<span style='color:#17A398; font-weight:600;'>{name}</span>"
            f" — <span style='color:#8B949E;'>{desc}</span></div>",
            unsafe_allow_html=True,
        )

    # ── Footer ────────────────────────────────────────────────────────────────
    st.markdown("<br/><hr style='border-color:#21262D;'/>", unsafe_allow_html=True)
    st.markdown(
        "<div style='text-align:center; color:#444D56; font-size:0.8rem;'>"
        "ME ESG Analytics Dashboard · Portfolio Project · Data: Synthetic (calibrated to real-world orders of magnitude)"
        "</div>",
        unsafe_allow_html=True,
    )
