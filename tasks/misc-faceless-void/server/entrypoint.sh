#!/bin/bash

nginx

uvicorn main:app --host 0.0.0.0 --port 8000 &

UVICORN_PID=$!

echo "Waiting for FastAPI server to be ready..."
until curl -s http://localhost:8000/docs > /dev/null; do
    sleep 1
done

echo "FastAPI server is ready. Registering admin user..."

/app/admin/register_admin.sh

wait $UVICORN_PID 