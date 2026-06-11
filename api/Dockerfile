FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Honor the platform-provided $PORT (Render, Fly, etc.) and default to 8000
# locally and on hosts that expect a fixed port (Koyeb, plain Docker).
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
