#!/bin/sh
# A Chromium for tests/shots.mjs: the one inside the resume image, capped, with
# remote debugging on 127.0.0.1:9333. It shares the host's network so it can
# open the preview app on 127.0.0.1:18088.
#
#   tests/browser.sh start | stop
set -eu
NAME=resume-test-browser

case "${1:-}" in
  start)
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    docker run -d --name "$NAME" --cpus 1 --memory 1g --shm-size 256m --network host --user 1000:1000 \
      -e HOME=/tmp resume:latest chromium-browser --headless --no-sandbox --disable-gpu --disable-dev-shm-usage \
      --no-first-run --hide-scrollbars --user-data-dir=/tmp/profile \
      --remote-debugging-address=127.0.0.1 --remote-debugging-port=9333 about:blank >/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if wget -q -O /dev/null http://127.0.0.1:9333/json/version 2>/dev/null; then echo "browser ready on :9333"; exit 0; fi
      sleep 1
    done
    echo "the browser did not come up:"; docker logs "$NAME" 2>&1 | tail -5; exit 1 ;;
  stop)
    docker rm -f "$NAME" >/dev/null 2>&1 || true ;;
  *)
    echo "usage: $0 start|stop"; exit 2 ;;
esac
