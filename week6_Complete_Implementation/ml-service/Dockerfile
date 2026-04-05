FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /build

COPY requirements.txt ./
RUN pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements.txt \
    && pip wheel --no-cache-dir --wheel-dir /build/wheels gunicorn

FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir /wheels/* \
    && rm -rf /wheels

COPY . .

RUN mkdir -p /app/trained_models

EXPOSE 8001

CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "2", "-b", "0.0.0.0:8001", "app.main:app"]
