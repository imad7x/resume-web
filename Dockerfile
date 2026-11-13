FROM python:3.13-alpine

# 7xResume: a standard library server plus Chromium, which turns a resume page into a PDF (headless, run once
# per download). The fonts the templates use are served from app/web/fonts; DejaVu and Noto cover the odd
# symbol they lack (arrows, dashes). tzdata for TZ=Asia/Kolkata.
RUN apk add --no-cache tzdata chromium font-dejavu font-noto

# The code is baked in and owned by root, so the server (uid 1000) can't change it.
WORKDIR /app
COPY app/ /app/
RUN find /app -name "__pycache__" -prune -exec rm -rf {} + ; chmod -R a+rX,go-w /app

EXPOSE 18089
CMD ["python", "/app/server.py"]
