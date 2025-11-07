# Dockerfile for CMS Code Execution Environment
# Week 1: Docker Environment + Helper Functions

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy helper functions
COPY code_helpers.py /app/code_helpers.py

# Set environment variables (can be overridden at runtime)
ENV FASTAPI_URL=http://host.docker.internal:8000
ENV PYTHONUNBUFFERED=1

# Default command (for testing)
CMD ["python", "-c", "from code_helpers import *; print('Helper functions loaded successfully')"]
