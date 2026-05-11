"""
backend/models/model_trainer.py
--------------------------------
ModelTrainer — engineers features, trains Ridge Regression and Random Forest
models, evaluates both, selects the winner, and persists the best model.

Architecture decisions:
- Lag and rolling features are computed within each country group so no
  country's history pollutes another's.  This matters because the panel is
  sorted Saudi → UAE → ... and a naïve shift() would bleed across borders.
- Train/test split is temporal (2015–2021 train, 2022–2024 test), not random,
  to respect time-series ordering and give a realistic hold-out scenario.
- Ridge is chosen as the linear baseline because ESG budget features are
  correlated (multicollinearity), making plain OLS unstable.
- Feature importances from the Random Forest double as an explainability
  artefact that feeds into model_report.json.
- joblib is used for serialisation — it handles numpy arrays more efficiently
  than pickle for sklearn estimators.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

# ── Constants ──────────────────────────────────────────────────────────────────
TRAIN_YEARS = list(range(2015, 2022))   # 2015–2021 inclusive
TEST_YEARS  = list(range(2022, 2025))   # 2022–2024 inclusive
TARGET_COL  = "esg_budget_usd_million"
MODEL_DIR   = Path("backend/models/saved_models")
REPORT_PATH = Path("data/processed/model_report.json")


class ModelTrainer:
    """
    Full ML pipeline: feature engineering → train/test split →
    Ridge + Random Forest → evaluation → best-model selection → persistence.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned ESG DataFrame (output of ESGDataLoader).
    model_dir : Path-like
        Directory where trained models are saved via joblib.
    """

    def __init__(self, df: pd.DataFrame, model_dir: str | Path = MODEL_DIR) -> None:
        self.raw_df    = df.copy()
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        # Populated after fit()
        self.feature_df: pd.DataFrame | None   = None
        self.feature_cols: list[str]            = []
        self.X_train: pd.DataFrame | None       = None
        self.X_test:  pd.DataFrame | None       = None
        self.y_train: pd.Series    | None       = None
        self.y_test:  pd.Series    | None       = None
        self.models:  dict[str, Any]            = {}
        self.metrics: dict[str, dict]           = {}
        self.best_model_name: str | None        = None

    # ── Public API ─────────────────────────────────────────────────────────────

    def run(self) -> dict:
        """
        Execute the full pipeline end-to-end and return the metrics dict.
        Call order: engineer → split → train → evaluate → select → save.
        """
        print("=" * 60)
        print("  ESG Budget Model Trainer")
        print("=" * 60)

        self._engineer_features()
        self._split_data()
        self._train_ridge()
        self._train_random_forest()
        self._evaluate_all()
        self._select_best()
        self._save_best()
        self._print_comparison_table()

        return self.metrics

    def get_feature_importances(self) -> pd.Series:
        """Returns Random Forest feature importances as a named Series."""
        rf_pipeline = self.models.get("RandomForest")
        if rf_pipeline is None:
            raise RuntimeError("Random Forest not trained yet. Call run() first.")

        rf = rf_pipeline.named_steps["model"]
        return pd.Series(
            rf.feature_importances_,
            index=self.feature_cols,
        ).sort_values(ascending=False)

    # ── Feature Engineering ───────────────────────────────────────────────────

    def _engineer_features(self) -> None:
        """
        Builds the modelling DataFrame with 5 engineered features.
        All lag/rolling ops are group-wise (per country) to prevent leakage.
        """
        print("\n[1/5] Engineering features...")

        df = self.raw_df.sort_values(["country", "year"]).copy()

        # ── lag_1_budget: prior year ESG budget ───────────────────────────────
        df["lag_1_budget"] = (
            df.groupby("country")[TARGET_COL].shift(1)
        )

        # ── lag_2_budget: two years prior ─────────────────────────────────────
        df["lag_2_budget"] = (
            df.groupby("country")[TARGET_COL].shift(2)
        )

        # ── rolling_3yr_avg: 3-year rolling mean (min_periods=2 to keep 2016) ─
        df["rolling_3yr_avg"] = (
            df.groupby("country")[TARGET_COL]
            .transform(lambda s: s.shift(1).rolling(3, min_periods=2).mean())
        )

        # ── policy_x_gdp: interaction term — policy strength × economic size ──
        # Captures the amplifying effect of strong policy in large economies.
        df["policy_x_gdp"] = df["policy_index"] * df["gdp_usd_billion"]

        # ── oil_dependency_ratio: oil revenue as share of GDP ─────────────────
        # Converts to comparable % scale; higher = more hydrocarbon-dependent.
        df["oil_dependency_ratio"] = (
            df["oil_revenue_usd_billion"] / (df["gdp_usd_billion"] + 1e-9)
        )

        # Drop rows with NaN in any engineered feature (typically 2015 & 2016
        # for lag_2 and rolling — 16 rows across 8 countries).
        feature_cols = [
            "lag_1_budget", "lag_2_budget", "rolling_3yr_avg",
            "policy_x_gdp", "oil_dependency_ratio",
            # Include base features that add signal without data leakage
            "gdp_usd_billion", "policy_index",
            "esg_score", "carbon_emissions_mt",
        ]

        df = df.dropna(subset=feature_cols).reset_index(drop=True)

        self.feature_df   = df
        self.feature_cols = feature_cols

        print(f"    Features built: {feature_cols}")
        print(f"    Rows after dropping NaN lag rows: {len(df)} "
              f"(dropped {len(self.raw_df) - len(df)} lag-NaN rows)")

    # ── Train / Test Split ────────────────────────────────────────────────────

    def _split_data(self) -> None:
        """Temporal split: train 2015–2021, test 2022–2024."""
        print("\n[2/5] Splitting data (train: 2015–2021 | test: 2022–2024)...")

        df = self.feature_df
        train = df[df["year"].isin(TRAIN_YEARS)]
        test  = df[df["year"].isin(TEST_YEARS)]

        self.X_train = train[self.feature_cols]
        self.y_train = train[TARGET_COL]
        self.X_test  = test[self.feature_cols]
        self.y_test  = test[TARGET_COL]

        print(f"    Train: {len(self.X_train)} rows | Test: {len(self.X_test)} rows")

    # ── Model Training ────────────────────────────────────────────────────────

    def _train_ridge(self) -> None:
        """
        Ridge Regression wrapped in a StandardScaler Pipeline.
        Scaling is mandatory for Ridge — L2 penalty is sensitive to feature scale.
        Alpha=10 chosen via light domain reasoning (regularise aggressively for
        a small panel dataset where p approaches n).
        """
        print("\n[3/5] Training Ridge Regression...")

        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("model",  Ridge(alpha=10.0, random_state=42)),
        ])
        pipeline.fit(self.X_train, self.y_train)
        self.models["Ridge"] = pipeline
        print("    Ridge fitted ✅")

    def _train_random_forest(self) -> None:
        """
        Random Forest Regressor — ensemble of 300 trees.
        No scaling needed (tree-based model is scale-invariant).
        min_samples_leaf=2 guards against overfitting on the small dataset.
        """
        print("\n[4/5] Training Random Forest Regressor...")

        pipeline = Pipeline([
            ("model", RandomForestRegressor(
                n_estimators=300,
                max_depth=6,           # shallow trees to prevent overfitting
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            )),
        ])
        pipeline.fit(self.X_train, self.y_train)
        self.models["RandomForest"] = pipeline
        print("    Random Forest fitted ✅")

    # ── Evaluation ────────────────────────────────────────────────────────────

    def _evaluate_all(self) -> None:
        """Compute RMSE, MAE, R² for every trained model on the test set."""
        print("\n[5/5] Evaluating models on test set (2022–2024)...")

        for name, pipeline in self.models.items():
            y_pred = pipeline.predict(self.X_test)
            rmse   = float(np.sqrt(mean_squared_error(self.y_test, y_pred)))
            mae    = float(mean_absolute_error(self.y_test, y_pred))
            r2     = float(r2_score(self.y_test, y_pred))

            self.metrics[name] = {
                "RMSE": round(rmse, 2),
                "MAE":  round(mae,  2),
                "R2":   round(r2,   4),
                # Store per-country predictions for diagnostics
                "predictions": pd.Series(y_pred, index=self.X_test.index).tolist(),
            }
            print(f"    {name:15s} → RMSE: {rmse:>8,.1f} | MAE: {mae:>8,.1f} | R²: {r2:.4f}")

    # ── Best Model Selection ──────────────────────────────────────────────────

    def _select_best(self) -> None:
        """
        Select the model with the lowest RMSE on the test set.
        RMSE is preferred over R² here because it penalises large individual
        country prediction errors more heavily — important for a dashboard
        where a single outlier country matters to the end user.
        """
        self.best_model_name = min(
            self.metrics, key=lambda k: self.metrics[k]["RMSE"]
        )
        print(f"\n    🏆  Best model: {self.best_model_name} "
              f"(RMSE = {self.metrics[self.best_model_name]['RMSE']:,.1f})")

    # ── Persistence ───────────────────────────────────────────────────────────

    def _save_best(self) -> None:
        """Serialise the best pipeline to disk with joblib."""
        path = self.model_dir / f"best_model_{self.best_model_name.lower()}.joblib"
        joblib.dump(self.models[self.best_model_name], path)
        print(f"    💾  Saved → {path}")

        # Also save metadata alongside the model
        meta_path = self.model_dir / "model_meta.json"
        meta = {
            "best_model":    self.best_model_name,
            "feature_cols":  self.feature_cols,
            "train_years":   TRAIN_YEARS,
            "test_years":    TEST_YEARS,
            "metrics": {
                k: {kk: vv for kk, vv in v.items() if kk != "predictions"}
                for k, v in self.metrics.items()
            },
        }
        meta_path.write_text(json.dumps(meta, indent=2))
        print(f"    💾  Metadata → {meta_path}")

    # ── Pretty-print comparison table ─────────────────────────────────────────

    def _print_comparison_table(self) -> None:
        header = f"\n{'Model':<18} {'RMSE':>12} {'MAE':>12} {'R²':>8}  {'Winner?'}"
        print("\n" + "=" * 60)
        print("  Model Comparison — Test Set (2022–2024)")
        print("=" * 60)
        print(header)
        print("-" * 60)
        for name, m in self.metrics.items():
            winner = " ✅" if name == self.best_model_name else ""
            print(f"  {name:<16} {m['RMSE']:>12,.1f} {m['MAE']:>12,.1f} {m['R2']:>8.4f}{winner}")
        print("=" * 60)

        # Feature importances from Random Forest
        print("\n  Random Forest — Feature Importances")
        print("-" * 40)
        for feat, imp in self.get_feature_importances().items():
            bar = "█" * int(imp * 50)
            print(f"  {feat:<25} {imp:.4f}  {bar}")
        print("=" * 60)


# ── Convenience runner ─────────────────────────────────────────────────────────
def train(df: pd.DataFrame) -> ModelTrainer:
    """
    Top-level helper — import and call this from other modules.

    Example
    -------
    >>> from backend.models.model_trainer import train
    >>> trainer = train(clean_df)
    >>> importances = trainer.get_feature_importances()
    """
    trainer = ModelTrainer(df)
    trainer.run()
    return trainer


if __name__ == "__main__":
    # Standalone smoke-test
    import sys
    sys.path.insert(0, str(Path(__file__).parents[2]))
    clean_df = pd.read_csv("data/processed/me_esg_clean.csv")
    train(clean_df)
