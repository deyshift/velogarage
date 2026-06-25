FROM python:3.13-slim

# Install dependencies with Poetry into the system environment (no extra venv),
# so uvicorn and friends are on PATH at runtime.
ENV POETRY_VERSION=2.3.3 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1
RUN pip install --no-cache-dir "poetry==${POETRY_VERSION}"

WORKDIR /app

# Copy only the manifests first so the dependency layer caches across code changes.
COPY pyproject.toml poetry.lock ./
RUN poetry install --only main

COPY . .

EXPOSE 8000
# Honor the platform-provided $PORT (Render, Fly, etc.) and default to 8000
# locally and on hosts that expect a fixed port (Koyeb, plain Docker).
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
