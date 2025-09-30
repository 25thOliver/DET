FROM python:3.10-slim

WORKDIR /app

# Install dependencies from lock file
COPY requirements.lock .

# Upgrade pip & install with retries and longer timeout
RUN pip install --upgrade pip setuptools wheel \
    && pip install --default-timeout=100 --retries=10 --no-cache-dir -r requirements.lock

# Copy app code
COPY . .

# Run FastAPI with Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
