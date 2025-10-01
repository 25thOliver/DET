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

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "6000"]
