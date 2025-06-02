FROM python:3.12.9

ENV SECRET_URL "https://hidden-staging.task.sasc.tf/secrets/like/silence/34/7341c085ab1ff63e8409ac9073da9f"

RUN apt update
RUN apt install -y zlib1g-dev udev libnss3 ca-certificates
RUN apt install -y chromium

RUN rm -rf /tmp/* /var/lib/apt/lists/* /usr/share/man

RUN pip install --break-system-packages --no-cache-dir selenium aiohttp chromedriver-autoinstaller

RUN mkdir -p /home/bot/data/

WORKDIR /app

COPY *.py .
COPY static static/

RUN python3 bot.py
CMD python3 server.py