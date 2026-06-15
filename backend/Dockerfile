FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies for the FastAPI inference service.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir \
        fastapi==0.115.0 \
        "uvicorn[standard]" \
        python-multipart \
        torch==2.6.0 \
        numpy \
        nibabel \
        pillow

# Copy application code only. Runtime data is mounted by Docker Compose.
COPY app ./app

RUN mkdir -p uploads outputs checkpoints

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
