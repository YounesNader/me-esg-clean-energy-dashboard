"""
generate_data.py
----------------
Generates a realistic synthetic dataset of ESG budget trends in the
Middle East Clean Energy sector (2015–2024).

Design decisions:
- Gulf states (SA, UAE, Qatar) get higher base budgets reflecting their
  sovereign wealth and national vision programmes.
- A post-2020 multiplier models the Paris Agreement / COP26 acceleration.
- Sector is assigned per row so each country-year has one primary focus,
  cycling through the five sectors with some randomness.
- Noise is multiplicative (not additive) so variance scales with magnitude,
  which is more realistic for financial data.
"""

import numpy as np
import pandas as pd
from pathlib import Path

# ── Reproducibility ───────────────────────────────────────────────────────────
SEED = 42
rng = np.random.default_rng(SEED)

# ── Constants ─────────────────────────────────────────────────────────────────
YEARS = list(range(2015, 2025))          # 2015–2024 inclusive
COUNTRIES = [
    "Saudi Arabia", "UAE", "Qatar",
    "Kuwait", "Oman", "Bahrain",
    "Jordan", "Egypt",
]
SECTORS = ["Solar", "Wind", "Hydrogen", "Grid Infrastructure", "Carbon Capture"]

# ── Country-level base parameters ─────────────────────────────────────────────
# Each tuple: (esg_budget_base, re_invest_base, solar_base, wind_base,
#              emissions_base, gdp_base, oil_rev_base, population, policy_base)
COUNTRY_PARAMS = {
    #                  esg    re    solar  wind  co2   gdp   oil   pop   policy
    "Saudi Arabia": (4500, 2800, 1200,  200, 680,  780, 200,  35.5,  5.5),
    "UAE":          (3800, 2500, 2200,   80, 210,  430,  80,   9.9,  7.0),
    "Qatar":        (2200, 1400,  500,   30, 110,  180,  70,   2.9,  5.0),
    "Kuwait":       (1200,  700,  300,   20, 100,  140,  55,   4.3,  3.5),
    "Oman":         (1000,  600,  250,   80,  70,   85,  25,   4.5,  4.0),
    "Bahrain":      ( 400,  250,  120,   10,  35,   38,  10,   1.5,  3.0),
    "Jordan":       ( 300,  200,  200,  120,  25,   44,   0,  10.2,  5.5),
    "Egypt":        ( 600,  450,  400,  300,  90,  400,  10, 104.0,  4.5),
}

# ── Post-2020 acceleration multipliers (COP26, Vision 2030, UAE Net Zero) ─────
# UAE and Saudi spike hardest after 2021.
def year_multiplier(country: str, year: int) -> float:
    """
    Returns a growth multiplier applied on top of base values.
    Pre-2020: gentle linear ramp.
    2020+:    steeper curve; UAE & Saudi get an extra boost post-2021.
    """
    base_growth = 1.0 + (year - 2015) * 0.04          # ~4 % CAGR baseline
    if year >= 2020:
        paris_boost = 1.0 + (year - 2019) * 0.08      # Paris acceleration
    else:
        paris_boost = 1.0

    cop26_boost = 1.0
    if year >= 2022 and country in ("UAE", "Saudi Arabia"):
        cop26_boost = 1.0 + (year - 2021) * 0.12      # Vision 2030 / Net Zero

    return base_growth * paris_boost * cop26_boost


def noisy(value: float, pct: float = 0.08) -> float:
    """Multiplicative noise: value * (1 ± pct). Keeps sign and scale intact."""
    return value * (1.0 + rng.uniform(-pct, pct))


# ── Build records ─────────────────────────────────────────────────────────────
records = []

for country, params in COUNTRY_PARAMS.items():
    (esg_b, re_b, sol_b, wind_b,
     co2_b, gdp_b, oil_b, pop, pol_b) = params

    for i, year in enumerate(YEARS):
        mult = year_multiplier(country, year)

        # Core financial / energy figures — scale with multiplier + noise
        esg_budget  = noisy(esg_b  * mult)
        re_invest   = noisy(re_b   * mult)
        solar_cap   = noisy(sol_b  * mult)
        wind_cap    = noisy(wind_b * (1.0 + i * 0.06))   # wind grows steadily
        gdp         = noisy(gdp_b  * (1.0 + i * 0.035))  # GDP grows ~3.5 % pa
        oil_rev     = noisy(oil_b  * (1.0 + rng.uniform(-0.15, 0.15)))

        # Carbon emissions DECREASE as ESG rises — inverse relationship
        # We model a gentle annual decline amplified by the ESG score level.
        emission_decline = 1.0 - (mult - 1.0) * 0.25
        carbon_ems = noisy(co2_b * max(emission_decline, 0.6))

        # ESG score: 0–100 composite — rises with investment, falls with emissions
        esg_score = min(
            100,
            noisy(30 + (mult - 1.0) * 80 - carbon_ems / co2_b * 5, pct=0.05)
        )
        esg_score = max(0, esg_score)   # clamp to valid range

        # Policy index: 0–10, generally improving, capped at 9.5
        policy = min(9.5, noisy(pol_b + i * 0.12, pct=0.06))

        # Green bonds: correlated with ESG budget but with a 1-year lag feel
        green_bonds = noisy(esg_budget * rng.uniform(0.05, 0.20))

        # Population grows slowly (~1.5 % pa for most; Egypt faster)
        pop_growth = 0.025 if country == "Egypt" else 0.015
        population = noisy(pop * (1 + pop_growth) ** i, pct=0.01)

        # Sector: cycle through the five options with a country-specific offset
        # so different countries lead different sectors — more realistic portfolio
        country_offset = list(COUNTRY_PARAMS.keys()).index(country)
        sector = SECTORS[(i + country_offset) % len(SECTORS)]

        records.append({
            "country":                         country,
            "year":                            year,
            "esg_budget_usd_million":          round(esg_budget,  2),
            "renewable_energy_investment_usd_million": round(re_invest, 2),
            "solar_capacity_mw":               round(solar_cap,   2),
            "wind_capacity_mw":                round(wind_cap,    2),
            "carbon_emissions_mt":             round(carbon_ems,  2),
            "esg_score":                       round(esg_score,   2),
            "gdp_usd_billion":                 round(gdp,         2),
            "oil_revenue_usd_billion":         round(oil_rev,     2),
            "population_million":              round(population,  3),
            "policy_index":                    round(policy,      2),
            "green_bonds_issued_usd_million":  round(green_bonds, 2),
            "sector":                          sector,
        })

# ── Persist ───────────────────────────────────────────────────────────────────
out_path = Path("data/raw/me_esg_data.csv")
out_path.parent.mkdir(parents=True, exist_ok=True)

df = pd.DataFrame(records)
df = df.sort_values(["country", "year"]).reset_index(drop=True)
df.to_csv(out_path, index=False)

print(f"✅  Dataset written → {out_path}")
print(f"   Shape : {df.shape[0]} rows × {df.shape[1]} columns")
print(f"   Years : {df['year'].min()} – {df['year'].max()}")
print(f"   Countries : {df['country'].nunique()}")
print(df.head(10).to_string(index=False))
