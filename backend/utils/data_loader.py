"""
backend/utils/data_loader.py
-----------------------------
ESGDataLoader — loads, cleans, and enriches the raw ME ESG CSV.

Design decisions:
- Forward-fill is applied per-country (group-aware) rather than globally,
  so a gap in Qatar's data doesn't bleed into Kuwait's records.
- Derived metrics are calculated after ffill so they always have valid
  denominators; a tiny epsilon guards against division-by-zero.
- The class is stateless between calls: load_data() returns a fresh copy
  each time so callers can mutate without side-effects.
- Summary stats are returned as a plain dict (JSON-serialisable) to make
  them easy to feed into a FastAPI response or a Streamlit metric widget.
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────
RAW_PATH       = Path("data/raw/me_esg_data.csv")
PROCESSED_PATH = Path("data/processed/me_esg_clean.csv")

EPSILON = 1e-9   # guard against division-by-zero in efficiency ratio


class ESGDataLoader:
    """
    Loads, cleans, and enriches ME ESG data.

    Usage
    -----
    >>> loader = ESGDataLoader()
    >>> df     = loader.load_data()
    >>> stats  = loader.get_summary_stats()
    """

    def __init__(
        self,
        raw_path: str | Path = RAW_PATH,
        processed_path: str | Path = PROCESSED_PATH,
    ) -> None:
        self.raw_path       = Path(raw_path)
        self.processed_path = Path(processed_path)
        self._df: pd.DataFrame | None = None   # cache after first load

    # ── Public API ────────────────────────────────────────────────────────────

    def load_data(self, force_reload: bool = False) -> pd.DataFrame:
        """
        Returns a clean, enriched DataFrame.
        Results are cached; pass force_reload=True to re-read from disk.
        """
        if self._df is None or force_reload:
            raw  = self._read_raw()
            norm = self._normalise_columns(raw)
            fill = self._handle_missing(norm)
            self._df = self._add_derived_columns(fill)
            self._save_processed(self._df)
        return self._df.copy()

    def get_summary_stats(self) -> dict:
        """
        Returns a JSON-serialisable dict of key statistics useful for
        dashboard KPI cards and model feature analysis.
        """
        if self._df is None:
            self.load_data()

        df = self._df

        # Latest year slice for point-in-time stats
        latest_year = df["year"].max()
        latest      = df[df["year"] == latest_year]

        stats = {
            "dataset": {
                "rows":          int(len(df)),
                "countries":     int(df["country"].nunique()),
                "year_range":    [int(df["year"].min()), int(df["year"].max())],
                "sectors":       sorted(df["sector"].unique().tolist()),
            },
            "latest_year": int(latest_year),
            "totals": {
                # Total ESG budget across all countries in the latest year
                "esg_budget_usd_million":             round(float(latest["esg_budget_usd_million"].sum()), 2),
                "renewable_energy_investment_usd_million": round(float(latest["renewable_energy_investment_usd_million"].sum()), 2),
                "green_bonds_issued_usd_million":     round(float(latest["green_bonds_issued_usd_million"].sum()), 2),
            },
            "averages": {
                "esg_score":      round(float(latest["esg_score"].mean()), 2),
                "policy_index":   round(float(latest["policy_index"].mean()), 2),
                # Average YoY growth rate across all countries
                "yoy_growth_pct": round(float(df["yoy_growth"].dropna().mean()), 2),
            },
            "leaders": {
                # Country with highest ESG budget in latest year
                "highest_esg_budget": {
                    "country": str(latest.loc[latest["esg_budget_usd_million"].idxmax(), "country"]),
                    "value":   round(float(latest["esg_budget_usd_million"].max()), 2),
                },
                # Country with best ESG score
                "highest_esg_score": {
                    "country": str(latest.loc[latest["esg_score"].idxmax(), "country"]),
                    "value":   round(float(latest["esg_score"].max()), 2),
                },
                # Country with highest investment efficiency
                "highest_efficiency": {
                    "country": str(latest.loc[latest["investment_efficiency"].idxmax(), "country"]),
                    "value":   round(float(latest["investment_efficiency"].max()), 4),
                },
            },
            "trends": {
                # Mean budget by year — useful for trend charts
                "mean_esg_budget_by_year": (
                    df.groupby("year")["esg_budget_usd_million"]
                    .mean()
                    .round(2)
                    .to_dict()
                ),
            },
        }
        return stats

    # ── Private helpers ───────────────────────────────────────────────────────

    def _read_raw(self) -> pd.DataFrame:
        """Read raw CSV, raise a helpful error if the file is missing."""
        if not self.raw_path.exists():
            raise FileNotFoundError(
                f"Raw data not found at '{self.raw_path}'. "
                "Run generate_data.py first."
            )
        df = pd.read_csv(self.raw_path)
        print(f"📂  Loaded raw data: {df.shape[0]} rows from '{self.raw_path}'")
        return df

    @staticmethod
    def _to_snake_case(name: str) -> str:
        """'CamelCase' or 'Mixed Column Name' → 'mixed_column_name'."""
        # Insert underscore before uppercase letters that follow lowercase
        s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name)
        # Replace spaces / hyphens with underscores, strip and lower-case
        s = re.sub(r"[\s\-]+", "_", s).strip("_").lower()
        return s

    def _normalise_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Rename all columns to snake_case for consistency."""
        df = df.copy()
        df.columns = [self._to_snake_case(c) for c in df.columns]
        return df

    def _handle_missing(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Forward-fill numeric columns within each country group.
        This handles sparse survey data where a country may skip a year.
        After ffill, any leading NaNs (no prior value to propagate) are
        back-filled so no NaNs remain.
        """
        df = df.copy()
        df = df.sort_values(["country", "year"])

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        df[numeric_cols] = (
            df.groupby("country")[numeric_cols]
            .transform(lambda g: g.ffill().bfill())
        )

        remaining = df[numeric_cols].isna().sum().sum()
        if remaining:
            print(f"⚠️   {remaining} NaN(s) remain after ffill/bfill — check raw data.")
        else:
            print("✅  Missing value handling complete — no NaNs remaining.")

        return df

    def _add_derived_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Adds three engineered features:

        esg_budget_per_gdp (%)
            ESG commitment relative to economic size — normalises across
            countries with very different GDP levels (Egypt vs UAE).

        yoy_growth (%)
            Year-over-year change in esg_budget per country.
            Expressed as a percentage; NaN for each country's first year.

        investment_efficiency
            Renewable investment per unit of carbon emission.
            Higher = more impact per dollar; useful as a model feature.
        """
        df = df.copy()

        # --- 1. ESG budget as % of GDP -----------------------------------------
        df["esg_budget_per_gdp"] = (
            df["esg_budget_usd_million"]
            / (df["gdp_usd_billion"] * 1_000 + EPSILON)   # convert billion→million
            * 100
        ).round(4)

        # --- 2. Year-over-year growth in ESG budget per country ----------------
        df = df.sort_values(["country", "year"])
        df["yoy_growth"] = (
            df.groupby("country")["esg_budget_usd_million"]
            .pct_change() * 100
        ).round(4)

        # --- 3. Investment efficiency: RE invest / carbon emissions -------------
        df["investment_efficiency"] = (
            df["renewable_energy_investment_usd_million"]
            / (df["carbon_emissions_mt"] + EPSILON)
        ).round(4)

        print("✅  Derived columns added: esg_budget_per_gdp, yoy_growth, investment_efficiency")
        return df

    def _save_processed(self, df: pd.DataFrame) -> None:
        """Persist cleaned data to the processed directory."""
        self.processed_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(self.processed_path, index=False)
        print(f"💾  Cleaned data saved → '{self.processed_path}' ({df.shape[0]} rows × {df.shape[1]} cols)")


# ── Quick smoke-test when run directly ────────────────────────────────────────
if __name__ == "__main__":
    loader = ESGDataLoader()
    df     = loader.load_data()

    print("\n── DataFrame info ───────────────────────────────────────────")
    print(df.dtypes.to_string())
    print(f"\nShape: {df.shape}")
    print("\n── Sample (Saudi Arabia) ─────────────────────────────────────")
    print(df[df["country"] == "Saudi Arabia"].tail(5).to_string(index=False))

    print("\n── Summary Stats ─────────────────────────────────────────────")
    import json
    stats = loader.get_summary_stats()
    print(json.dumps(stats, indent=2))
