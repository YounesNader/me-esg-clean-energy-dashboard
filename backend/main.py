"""
backend/main.py
----------------
Entry point for the ME ESG Analytics API.

Run with:
    uvicorn backend.main:app --reload

The startup event pre-loads the cleaned DataFrame and forecast CSV into
app.state so every router can access them without re-reading disk on
each request — critical for keeping p99 latency low on a small server.
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.routers.data_router     import router as data_router
from backend.routers.forecast_router import router as forecast_router
from backend.routers.insights_router import router as insights_router
from backend.schemas import APIInfo

# ── File paths (resolved relative to project root) ────────────────────────────
DATA_PATH         = Path("data/processed/me_esg_clean.csv")
FORECASTS_PATH    = Path("data/processed/forecasts.csv")
MODEL_REPORT_PATH = Path("data/processed/model_report.json")

# ── Application version ───────────────────────────────────────────────────────
API_VERSION = "1.0.0"


# ── Lifespan: pre-load data into app.state once at startup ────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context — runs setup before the server accepts requests
    and teardown when it shuts down.

    Loading DataFrames here means every router accesses in-memory data
    rather than hitting disk per request.  On the 80-row ESG dataset this
    saves ~5 ms per call and makes the API unit-testable with mock state.
    """
    # ── Startup ───────────────────────────────────────────────────────────────
    print("🚀  ME ESG API starting up — loading data into memory...")

    if not DATA_PATH.exists():
        raise RuntimeError(f"Clean data not found at '{DATA_PATH}'. Run the data pipeline first.")

    app.state.df           = pd.read_csv(DATA_PATH)
    app.state.forecasts_df = pd.read_csv(FORECASTS_PATH) if FORECASTS_PATH.exists() else pd.DataFrame()
    app.state.model_report = (
        json.loads(MODEL_REPORT_PATH.read_text()) if MODEL_REPORT_PATH.exists() else {}
    )
    app.state.countries    = sorted(app.state.df["country"].unique().tolist())

    print(f"   ✅  ESG data loaded     : {app.state.df.shape[0]} rows × {app.state.df.shape[1]} cols")
    print(f"   ✅  Forecast data loaded: {app.state.forecasts_df.shape[0]} rows")
    print(f"   ✅  Countries available : {app.state.countries}")
    print(f"   ✅  Model report        : {'loaded' if app.state.model_report else 'not found'}")
    print("   🟢  Ready to serve requests\n")

    yield  # Server runs here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    print("🔴  ME ESG API shutting down — clearing state...")
    del app.state.df
    del app.state.forecasts_df
    del app.state.model_report


# ── Application factory ───────────────────────────────────────────────────────
app = FastAPI(
    title="ME ESG Analytics API",
    version=API_VERSION,
    description=(
        "REST API serving ESG budget data, clean energy forecasts, and ML-powered "
        "insights for Middle East countries (2015–2030). "
        "Built with FastAPI + Prophet + scikit-learn."
    ),
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc alternative
    lifespan=lifespan,
)

# ── CORS — allow all origins for local React dev ──────────────────────────────
# ⚠️  Restrict `allow_origins` to your production domain before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(data_router,     prefix="/api/data",     tags=["Data"])
app.include_router(forecast_router, prefix="/api/forecast", tags=["Forecast"])
app.include_router(insights_router, prefix="/api/insights", tags=["Insights"])


# ── Root endpoint ─────────────────────────────────────────────────────────────
@app.get("/", response_model=APIInfo, summary="API info and available routes")
async def root() -> APIInfo:
    """
    Returns API metadata and a flat list of all registered routes.
    Useful as a health-check endpoint and for frontend service discovery.
    """
    routes = sorted(
        {
            route.path
            for route in app.routes
            if hasattr(route, "path") and route.path not in ("/", "/openapi.json")
        }
    )
    return APIInfo(
        title=app.title,
        version=API_VERSION,
        description="Middle East ESG & Clean Energy Analytics API",
        routes=routes,
    )


# ── Global exception handlers ─────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"detail": str(exc.detail)})


@app.exception_handler(422)
async def validation_error_handler(request, exc):
    return JSONResponse(status_code=422, content={"detail": "Validation error — check query parameters."})
