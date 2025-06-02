FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/admin/register_admin.sh /app/entrypoint.sh

RUN apt-get update && apt-get install -y nginx

COPY ./static /usr/share/nginx/html/static
COPY ./admin/admin.jpg /app/admin/admin.jpg


RUN mkdir -p /usr/share/nginx/html/static/models
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

ENTRYPOINT ["/app/entrypoint.sh"] 