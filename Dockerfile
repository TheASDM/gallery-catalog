# ---------- build stage: install dependencies ----------
FROM python:3.12-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- runtime stage ----------
FROM python:3.12-slim

LABEL maintainer="Danielle Cowdrey Art"
LABEL description="Gallery Catalog — product catalog with invoice request system"

# Non-root user
RUN groupadd -r catalog && useradd -r -g catalog -d /app -s /sbin/nologin catalog

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Application code
WORKDIR /app
COPY app/ ./app/
COPY static/ ./static/

# Data directory (will be mounted as volume)
RUN mkdir -p /data && chown catalog:catalog /data

# Switch to non-root
USER catalog

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--log-level", "info"]
