"""
backend/models/forecaster.py
-----------------------------
Forecaster — runs one Facebook Prophet model per country to forecast
esg_budget_usd_million from 2025 through 2030, incorporating external
regressors (GDP, policy index, oil revenue) to improve accuracy.

Architecture decisions:
- One model per country rather than a single panel model: Prophet is a
  univariate time-series model and does not natively support multi-entity
  panels. Fitting separately gives each country its own trend/seasonality
  parameters, which is appropriate given the heterogeneous growth profiles
  (Saudi Arabia ≠ Jordan).
- External regressors (GDP, policy_index, oil_revenue) are projected forward
  using a simple linear extrapolation from the last 3 years of observed data.
  This is intentionally conservative — real-world forecasting would replace
  these with macro projections from the IMF/World Bank.
- Prophet is wrapped in a try/except so the module remains importable even
  if Prophet is not installed, falling back gracefully with a clear message.
- yearly_seasonality=False: with only annual data (1 obs/year per country),
  sub-annual seasonality is not estimable and would overfit.
- changepoint_prior_scale=0.3 is more flexible than Prophet's default (0.05),
  reflecting the structural breaks known to exist in this data (COP26, 2021).
"""

from __future__ import annotations

import warnings
from pathlib import Path

import matplotlib
matplotlib.use("Agg")   # non-interactive backend — safe for server/headless use
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

# ── Graceful Prophet import ────────────────────────────────────────────────────
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    Prophet = None  # type: ignore

# ── Constants ──────────────────────────────────────────────────────────────────
FORECAST_START = 2025
FORECAST_END   = 2030
FORECAST_YEARS = list(range(FORECAST_START, FORECAST_END + 1))
REGRESSORS     = ["gdp_usd_billion", "policy_index", "oil_revenue_usd_billion"]
FORECAST_PATH  = Path("data/processed/forecasts.csv")
FIGURES_DIR    = Path("notebooks/figures")

# Country colour palette (consistent with EDA notebook)
PALETTE = {
    "Saudi Arabia": "#006D77",
    "UAE":          "#17A398",
    "Qatar":        "#2DC5A2",
    "Kuwait":       "#83C5BE",
    "Oman":         "#A8DADC",
    "Egypt":        "#C9A96E",
    "Bahrain":      "#E09F3E",
    "Jordan":       "#9E6B3F",
}


class Forecaster:
    """
    Per-country Prophet forecasts for ESG budget 2025–2030.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned ESG DataFrame (from ESGDataLoader or read directly from CSV).
    forecast_path : Path-like
        Where the combined forecast CSV is written.
    figures_dir : Path-like
        Where individual country forecast plots are saved.
    """

    def __init__(
        self,
        df: pd.DataFrame,
        forecast_path: str | Path = FORECAST_PATH,
        figures_dir:   str | Path = FIGURES_DIR,
    ) -> None:
        if not PROPHET_AVAILABLE:
            raise ImportError(
                "Prophet is not installed. Run: pip install prophet\n"
                "If you encounter build issues, try: conda install -c conda-forge prophet"
            )

        self.df            = df.copy().sort_values(["country", "year"])
        self.forecast_path = Path(forecast_path)
        self.figures_dir   = Path(figures_dir)
        self.figures_dir.mkdir(parents=True, exist_ok=True)

        # Populated after run()
        self.forecasts: dict[str, pd.DataFrame] = {}   # country → raw Prophet output
        self.combined_df: pd.DataFrame | None = None   # all countries, 2025–2030

    # ── Public API ─────────────────────────────────────────────────────────────

    def run(self) -> pd.DataFrame:
        """
        Fit one Prophet model per country, generate 2025–2030 forecasts,
        combine, save to CSV, and return the combined DataFrame.
        """
        if not PROPHET_AVAILABLE:
            raise ImportError("Prophet unavailable — see __init__ message.")

        print("=" * 60)
        print("  ESG Budget Forecaster (Prophet)")
        print(f"  Horizon: {FORECAST_START}–{FORECAST_END}")
        print("=" * 60)

        all_rows = []

        for country in sorted(self.df["country"].unique()):
            print(f"\n  📈  Fitting Prophet for {country}...")
            forecast_df = self._fit_and_forecast(country)
            self.forecasts[country] = forecast_df

            # Extract only the 2025–2030 window for the output CSV
            future_rows = forecast_df[forecast_df["year"].isin(FORECAST_YEARS)].copy()
            future_rows["country"] = country
            all_rows.append(future_rows)
            print(f"      Done — {len(future_rows)} forecast years generated")

        # Combine all countries into one flat DataFrame
        self.combined_df = (
            pd.concat(all_rows, ignore_index=True)
            [["country", "year", "predicted_budget", "lower_bound", "upper_bound"]]
            .sort_values(["country", "year"])
            .reset_index(drop=True)
        )

        # Save
        self.forecast_path.parent.mkdir(parents=True, exist_ok=True)
        self.combined_df.to_csv(self.forecast_path, index=False)
        print(f"\n  💾  Forecasts saved → {self.forecast_path}")
        print(f"      Shape: {self.combined_df.shape}")

        return self.combined_df

    def plot_forecast(
        self,
        country: str,
        save: bool = True,
    ) -> plt.Figure:
        """
        Produces a publication-quality forecast chart for one country:
          • Historical actuals as scatter dots
          • Prophet forecast line (2025–2030)
          • 80% confidence interval shaded
          • Dashed boundary at 2024
          • Annotations for COP26, UAE Net Zero, Saudi Vision 2030 milestone

        Parameters
        ----------
        country : str
            One of the 8 ME countries in the dataset.
        save : bool
            If True, saves the figure to figures_dir as a PNG.

        Returns
        -------
        matplotlib Figure object (caller can further customise or close).
        """
        if country not in self.forecasts:
            raise ValueError(
                f"No forecast for '{country}'. Available: {list(self.forecasts.keys())}"
            )

        forecast_df = self.forecasts[country]
        hist        = self.df[self.df["country"] == country].sort_values("year")
        color       = PALETTE.get(country, "#2DC5A2")

        fig, ax = plt.subplots(figsize=(13, 6))
        fig.patch.set_facecolor("#FAFAFA")
        ax.set_facecolor("#FAFAFA")

        # ── Historical actuals ────────────────────────────────────────────────
        ax.scatter(
            hist["year"], hist["esg_budget_usd_million"],
            color=color, s=70, zorder=5, label="Historical Actuals",
            edgecolors="white", linewidth=0.8,
        )
        # Connect actuals with a thin line for readability
        ax.plot(
            hist["year"], hist["esg_budget_usd_million"],
            color=color, linewidth=1.5, alpha=0.6,
        )

        # ── Forecast line (2025–2030) ─────────────────────────────────────────
        future = forecast_df[forecast_df["year"] >= FORECAST_START]
        ax.plot(
            future["year"], future["predicted_budget"],
            color=color, linewidth=2.5, linestyle="-",
            label=f"Forecast {FORECAST_START}–{FORECAST_END}", zorder=4,
        )

        # ── Confidence interval shading ───────────────────────────────────────
        ax.fill_between(
            future["year"],
            future["lower_bound"],
            future["upper_bound"],
            color=color, alpha=0.18, label="80% Confidence Interval",
        )

        # ── Train / forecast boundary ─────────────────────────────────────────
        ax.axvline(2024.5, color="#888888", linewidth=1.2, linestyle="--", alpha=0.8)
        ax.text(
            2024.6, ax.get_ylim()[1] * 0.97,
            "Forecast →", color="#888888", fontsize=8.5, va="top",
        )

        # ── Key event annotations ─────────────────────────────────────────────
        events = [
            (2021, "COP26 &\nUAE Net Zero",  0.60),
            (2025, "Vision 2030\nMilestone",  0.78),
        ]
        y_max = hist["esg_budget_usd_million"].max()
        for year, label, y_frac in events:
            ax.axvline(year, color="#E63946", linewidth=0.9, linestyle=":", alpha=0.7)
            ax.text(
                year + 0.08,
                y_max * y_frac,
                label,
                fontsize=7.5, color="#E63946", va="bottom",
                bbox=dict(boxstyle="round,pad=0.2", fc="white", alpha=0.7, ec="#E63946"),
            )

        # ── Formatting ────────────────────────────────────────────────────────
        ax.set_title(
            f"{country} — ESG Budget Forecast 2025–2030\n"
            f"(Prophet model with GDP, Policy Index & Oil Revenue regressors)",
            fontsize=12, fontweight="bold", pad=12,
        )
        ax.set_xlabel("Year", fontsize=11)
        ax.set_ylabel("ESG Budget (USD Million)", fontsize=11)
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"${x:,.0f}M"))
        ax.set_xticks(list(range(2015, 2031)))
        ax.tick_params(axis="x", rotation=35)
        ax.legend(loc="upper left", fontsize=9, framealpha=0.9)
        ax.grid(axis="y", color="#E5E5E5", linewidth=0.7)
        ax.grid(axis="x", visible=False)

        fig.text(
            0.5, -0.04,
            f"Caption: Forecast generated by Facebook Prophet with external regressors. "
            f"Shaded region = 80% credible interval. Boundary at 2024.",
            ha="center", style="italic", fontsize=8.5, color="#555555",
        )

        plt.tight_layout()

        if save:
            out_path = self.figures_dir / f"forecast_{country.lower().replace(' ', '_')}.png"
            fig.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="#FAFAFA")
            print(f"      Plot saved → {out_path.name}")

        return fig

    def plot_all(self) -> None:
        """Convenience method — calls plot_forecast() for every country."""
        for country in self.forecasts:
            self.plot_forecast(country, save=True)
            plt.close("all")

    def get_forecast_summary(self) -> dict:
        """
        Returns a dict of {country: mean_predicted_budget_2025_2030}
        for inclusion in model_report.json.
        """
        if self.combined_df is None:
            raise RuntimeError("No forecasts available. Call run() first.")

        summary = (
            self.combined_df
            .groupby("country")["predicted_budget"]
            .mean()
            .round(2)
            .to_dict()
        )
        return summary

    # ── Private helpers ────────────────────────────────────────────────────────

    def _fit_and_forecast(self, country: str) -> pd.DataFrame:
        """
        Fits a Prophet model for one country and returns a DataFrame
        covering 2015–2030 with columns:
          year | predicted_budget | lower_bound | upper_bound
        """
        hist = (
            self.df[self.df["country"] == country]
            .sort_values("year")
            .copy()
        )

        # Prophet requires columns named 'ds' (datestamp) and 'y' (target)
        prophet_df = pd.DataFrame({
            "ds": pd.to_datetime(hist["year"].astype(str) + "-01-01"),
            "y":  hist["esg_budget_usd_million"].values,
        })

        # Attach external regressors to the training DataFrame
        for reg in REGRESSORS:
            prophet_df[reg] = hist[reg].values

        # ── Initialise Prophet ────────────────────────────────────────────────
        model = Prophet(
            yearly_seasonality=False,   # annual data — seasonality not estimable
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.3,    # more flexible than default 0.05
            interval_width=0.80,            # 80% credible interval
            uncertainty_samples=500,
        )

        for reg in REGRESSORS:
            model.add_regressor(reg, standardize=True)

        model.fit(prophet_df)

        # ── Build future DataFrame ────────────────────────────────────────────
        # Prophet's make_future_dataframe uses calendar periods.
        # For annual data we pass 6 extra years beyond the training end.
        future = model.make_future_dataframe(periods=6, freq="YS")

        # Project regressors forward via linear extrapolation (last 3 obs)
        future = self._project_regressors(future, hist)

        # ── Predict ───────────────────────────────────────────────────────────
        forecast = model.predict(future)

        # ── Reshape output ────────────────────────────────────────────────────
        result = pd.DataFrame({
            "year":             forecast["ds"].dt.year,
            "predicted_budget": forecast["yhat"].clip(lower=0).round(2),
            "lower_bound":      forecast["yhat_lower"].clip(lower=0).round(2),
            "upper_bound":      forecast["yhat_upper"].clip(lower=0).round(2),
        })

        return result

    def _project_regressors(
        self,
        future: pd.DataFrame,
        hist: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Fills regressor values for forecast years using linear extrapolation
        from the last 3 observed years.  For historical years, uses actuals.
        """
        future = future.copy()
        future["year"] = future["ds"].dt.year

        for reg in REGRESSORS:
            # Build a lookup from historical years → actual values
            hist_lookup = dict(zip(hist["year"], hist[reg]))

            # Fit a simple linear trend on the last 3 observed years
            recent = hist.sort_values("year").tail(3)
            slope, intercept = np.polyfit(recent["year"], recent[reg], 1)

            projected = []
            for yr in future["year"]:
                if yr in hist_lookup:
                    projected.append(hist_lookup[yr])
                else:
                    # Linear extrapolation (capped at 0 for ratio-type regressors)
                    projected.append(max(0, slope * yr + intercept))

            future[reg] = projected

        return future.drop(columns=["year"])


# ── Convenience runner ─────────────────────────────────────────────────────────
def forecast(df: pd.DataFrame) -> Forecaster:
    """
    Top-level helper — import and call this from other modules or the CLI.

    Example
    -------
    >>> from backend.models.forecaster import forecast
    >>> fc = forecast(clean_df)
    >>> fig = fc.plot_forecast("UAE")
    """
    fc = Forecaster(df)
    fc.run()
    return fc


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parents[2]))
    clean_df = pd.read_csv("data/processed/me_esg_clean.csv")
    fc = forecast(clean_df)
    fc.plot_all()
    print("\nForecast summary:")
    import json
    print(json.dumps(fc.get_forecast_summary(), indent=2))
