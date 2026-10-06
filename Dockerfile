FROM node:22.23.2-bookworm-slim AS frontend-build
WORKDIR /build/Frontend
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci
COPY Frontend/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM python:3.14-slim-trixie AS backend-build
RUN python -m pip install --no-cache-dir uv==0.12.0
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /build/Backend
COPY Backend/pyproject.toml Backend/uv.lock ./
RUN uv sync --frozen --no-dev

FROM ollama/ollama:0.32.0 AS ollama

FROM postgres:17-trixie
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx libexpat1 libffi8 \
       libbz2-1.0 liblzma5 libsqlite3-0 libgdbm6 libgdbm-compat4 libreadline8 \
       libncursesw6 libstdc++6 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=backend-build /usr/local/ /usr/local/
COPY --from=backend-build /opt/venv/ /opt/venv/
COPY --from=ollama /bin/ollama /usr/bin/ollama
COPY --from=ollama /usr/lib/ollama/ /usr/lib/ollama/
COPY --from=frontend-build /build/Frontend/dist/ /app/Frontend/dist/
COPY Backend/ /app/Backend/
COPY docker/ /app/docker/

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OLLAMA_HOST=127.0.0.1:11434 \
    OLLAMA_NO_CLOUD=1
WORKDIR /app/Backend
EXPOSE 5173 8000 5432
STOPSIGNAL SIGTERM
ENTRYPOINT ["python", "/app/docker/start.py"]
