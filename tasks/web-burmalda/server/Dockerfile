FROM python:3.12

WORKDIR /app
COPY app/requirements.txt .

ENV PYTHONUNBUFFERED=1

RUN pip3 install -r requirements.txt

COPY app/. .

CMD gunicorn --bind 0.0.0.0:8000 -w 8 -k aiohttp.GunicornWebWorker main:burmalda_app