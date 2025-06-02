FROM python:3.12.9-slim

ENV UPLOAD_KEY="something_random_whatever_29391"

WORKDIR /app
RUN mkdir uploads

COPY src .

CMD python server.py