FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for trafilatura & lxml
RUN apt-get update && apt-get install -y \
    libxml2 \
    libxslt1.1 \
    libffi8 \
    wget \
    curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 6000

# Run Flask app via gunicorn on port 6000 to match compose mapping
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:6000", "--workers", "2", "--timeout", "120"]
