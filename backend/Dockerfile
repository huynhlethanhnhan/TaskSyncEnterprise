# Stage 1: Build dependencies in a temporary virtual environment
FROM python:3.12.10-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# Install build dependencies for compiling binary packages
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create and use a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy dependency list first to optimize Docker layer cache
COPY requirements.txt .

# Install production dependencies
# hadolint ignore=DL3013
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Stage 2: Hardened runtime environment
FROM python:3.12.10-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"

# Create a dedicated unprivileged user and group with explicit UID/GID
RUN groupadd -g 10001 tasksync \
    && useradd -u 10001 -g tasksync -m -s /sbin/nologin tasksync

# Copy pre-compiled dependencies from builder
COPY --from=builder /opt/venv /opt/venv

# Prepare writable directories and assign ownership to the tasksync user
RUN mkdir -p /app/uploads/avatars /app/uploads/attachments /app/logs \
    && chown -R tasksync:tasksync /app

# Copy application source code under tasksync ownership
COPY --chown=tasksync:tasksync . .

# Run subsequent operations and process as unprivileged user
USER tasksync

EXPOSE 8000

# Container health probe checking SRE live probe (using standard python library)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live')" || exit 1

ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
