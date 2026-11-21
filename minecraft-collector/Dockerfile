FROM python:3.13-slim
# tzdata so America/New_York exists for log timestamps and the 05:00 snapshot.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 TZ=America/New_York
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY collector.py import_sqlite.py /app/
HEALTHCHECK --interval=60s --timeout=5s --start-period=120s \
  CMD python -c "import os,sys,time; sys.exit(time.time()-os.path.getmtime('/data/heartbeat')>120)"
CMD ["python", "-u", "/app/collector.py"]
