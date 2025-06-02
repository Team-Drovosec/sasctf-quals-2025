FROM python:3.13-slim

WORKDIR /app

COPY server.py /app/
RUN pip install --no-cache-dir ecdsa pydantic

RUN useradd -m ctfuser
USER ctfuser

ENV FLAG="SAS{3ven_7h3_4uth0r_of_bl1nd5p07_t4sk_h45_bl1nd5pot}"

CMD ["python", "server.py"]