# ─────────────────────────────────────────────────────────────────────────────
# backend/Dockerfile
# ME ESG Analytics — Python / FastAPI backend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Metadata
LABEL maintainer="your-email@example.com"
LABEL description="ME ESG Analytics API — FastAPI + Prophet + scikit-learn"

# ── System dependencies ───────────────────────────────────────────────────────
# prophet needs build tools; slim image ships without them
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
        libgomp1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Python environment ────────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ── Install Python dependencies first (layer-cache friendly) ──────────────────
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# ── Copy source code ──────────────────────────────────────────────────────────
# backend/ package (routers, models, utils, schemas, main.py)
COPY backend/ ./backend/

# data/ directory — raw CSV and processed artefacts
# The compose volume mount overrides this for local dev;
# the COPY ensures the image is self-contained for production.
COPY data/ ./data/

# ── Non-root user for security ────────────────────────────────────────────────
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

EXPOSE 8000

# ── Entrypoint ────────────────────────────────────────────────────────────────
# --workers 1: single worker keeps in-memory app.state consistent
CMD ["uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info"]
