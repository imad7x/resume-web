#!/bin/sh
# Joins page pictures side by side into one, to look at several at once.
#   tests/montage.sh <out.png> <page.png>...     (paths inside tests/out)
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
docker run --rm --cpus 1 --memory 512m --user "$(id -u):$(id -g)" -v "$HERE/out":/w -w /w --entrypoint python3 finance-ingest:latest -c '
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert("RGB") for f in files]
h = max(i.height for i in ims)
sheet = Image.new("RGB", (sum(i.width for i in ims) + 12 * (len(ims) + 1), h + 24), (70, 74, 90))
x = 12
for i in ims:
    sheet.paste(i, (x, 12)); x += i.width + 12
sheet.save(out)
' "$@"
