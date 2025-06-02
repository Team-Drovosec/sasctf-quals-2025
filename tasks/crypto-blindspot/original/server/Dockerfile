FROM python:3.13-slim

WORKDIR /app

COPY server.py /app/
RUN pip install --no-cache-dir ecdsa pydantic

RUN useradd -m ctfuser
USER ctfuser

ENV FLAG="SAS{r05_4t7ack_s3e5_7hr0u6h_7h3_bl1nd5p0t}"

CMD ["python", "server.py"]