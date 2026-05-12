# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile (project root)
# ME ESG Analytics — Python / FastAPI backend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

LABEL description="ME ESG Analytics API — FastAPI + Prophet + scikit-learn"

# ── System dependencies ───────────────────────────────────────────────────────
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

# ── Install dependencies ──────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# ── Copy source ───────────────────────────────────────────────────────────────
COPY backend/ ./backend/
COPY data/ ./data/

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info"]
