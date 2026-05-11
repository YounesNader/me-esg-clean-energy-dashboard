"""
backend/models/generate_report.py
-----------------------------------
Orchestrates ModelTrainer + Forecaster and writes model_report.json.
Run this as the entry point for the full ML pipeline.

    python -m backend.models.generate_report
       — or —
    python backend/models/generate_report.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

# Make sure repo root is on sys.path regardless of working directory
sys.path.insert(0, str(Path(__file__).parents[2]))

from backend.models.model_trainer import ModelTrainer
from backend.models.forecaster    import Forecaster, PROPHET_AVAILABLE

REPORT_PATH = Path("data/processed/model_report.json")


def generate_report() -> dict:
    """
    Full pipeline:
      1. Load cleaned data
      2. Train Ridge + Random Forest  (ModelTrainer)
      3. Forecast 2025–2030           (Forecaster)
      4. Assemble and write model_report.json
    """

    # ── 1. Load data ──────────────────────────────────────────────────────────
    print("\n📂  Loading cleaned ESG data...")
    df = pd.read_csv("data/processed/me_esg_clean.csv")
    print(f"    {df.shape[0]} rows × {df.shape[1]} columns loaded")

    # ── 2. Train sklearn models ───────────────────────────────────────────────
    trainer = ModelTrainer(df)
    metrics = trainer.run()

    # Clean predictions list out of metrics before writing to JSON
    clean_metrics = {
        model: {k: v for k, v in vals.items() if k != "predictions"}
        for model, vals in metrics.items()
    }

    # Feature importances from Random Forest
    feature_importances = (
        trainer.get_feature_importances()
        .round(6)
        .to_dict()
    )

    # ── 3. Prophet forecasts ──────────────────────────────────────────────────
    forecast_summary: dict = {}
    prophet_status = "not_installed"

    if PROPHET_AVAILABLE:
        print("\n\n📈  Running Prophet forecasts...")
        try:
            fc = Forecaster(df)
            fc.run()
            fc.plot_all()
            forecast_summary = fc.get_forecast_summary()
            prophet_status = "success"
        except Exception as e:
            print(f"⚠️  Prophet forecasting failed: {e}")
            prophet_status = f"error: {e}"
    else:
        print("⚠️  Prophet not installed — skipping forecasts.")
        print("    Install with: pip install prophet")

    # ── 4. Assemble model_report.json ─────────────────────────────────────────
    report = {
        "pipeline": {
            "data_source":   "data/processed/me_esg_clean.csv",
            "train_years":   "2015–2021",
            "test_years":    "2022–2024",
            "target_column": "esg_budget_usd_million",
        },
        "best_model": trainer.best_model_name,
        "model_metrics": clean_metrics,
        "feature_importances_random_forest": feature_importances,
        "prophet_forecast": {
            "status":                     prophet_status,
            "horizon":                    "2025–2030",
            "regressors_used":            ["gdp_usd_billion", "policy_index", "oil_revenue_usd_billion"],
            "mean_predicted_budget_by_country": forecast_summary,
        },
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2))

    print(f"\n\n{'='*60}")
    print(f"  📄  model_report.json written → {REPORT_PATH}")
    print(f"{'='*60}")
    print(json.dumps(report, indent=2))

    return report


if __name__ == "__main__":
    generate_report()
