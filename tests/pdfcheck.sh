#!/bin/sh
# Do the PDFs still look exactly as before? Compares what the preview app
# prints now with the PDFs saved before a change, page by page, as pixels
# (the files themselves differ by their creation time).
#
#   tests/pdfcheck.sh save  [base-url]     keep today's PDFs as the baseline
#   tests/pdfcheck.sh check [base-url]     compare; exits 1 when a page differs
#
# The baseline lives beside the preview's data (next-state/baseline), outside
# git: the PDFs hold personal details. One PDF per template in A4, plus the
# saved template in US Letter, for the library's copy named "regression".
set -eu
MODE="${1:-check}"
BASE="${2:-http://127.0.0.1:18088}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
KEEP="${BASELINE:-$HERE/../next-state/baseline}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# the copy named "regression" (nobody edits it), else the first resume in the library
ID="$(wget -q -O - "$BASE/api/library?all=1" | python3 -c 'import json,sys; rs=json.load(sys.stdin)["resumes"]; print(([r["id"] for r in rs if r["title"]=="regression"] or [rs[0]["id"]])[0])')"
TEMPLATES="$(wget -q -O - "$BASE/api/templates" | python3 -c 'import json,sys; print(" ".join(t["id"] for t in json.load(sys.stdin)))')"

fetch() {  # fetch <dir>
  for t in $TEMPLATES; do wget -q -O "$1/$t-a4.pdf" "$BASE/api/resumes/$ID/pdf?t=$t&paper=a4"; done
  wget -q -O "$1/saved-letter.pdf" "$BASE/api/resumes/$ID/pdf?paper=letter"
}

if [ "$MODE" = save ]; then
  mkdir -p "$KEEP"; rm -f "$KEEP"/*.pdf; fetch "$KEEP"
  echo "baseline saved: $(ls "$KEEP" | wc -l) PDFs in $KEEP"; exit 0
fi

mkdir "$WORK/now" "$WORK/old"; fetch "$WORK/now"; cp "$KEEP"/*.pdf "$WORK/old/"
# pdftoppm comes with the finance-ingest image; one capped container rasterises both sets
docker run --rm --cpus 1 --memory 512m --user "$(id -u):$(id -g)" -v "$WORK":/w --entrypoint sh finance-ingest:latest -c '
  for d in old now; do for f in /w/$d/*.pdf; do pdftoppm -r 80 "$f" "${f%.pdf}" 2>/dev/null; done; done'
bad=0
for f in "$WORK"/old/*.ppm; do
  n="$(basename "$f")"
  if [ ! -f "$WORK/now/$n" ]; then echo "MISSING now: $n"; bad=1
  elif ! cmp -s "$f" "$WORK/now/$n"; then echo "DIFFERENT:   $n"; bad=1; fi
done
for f in "$WORK"/now/*.ppm; do [ -f "$WORK/old/$(basename "$f")" ] || { echo "NEW page:    $(basename "$f")"; bad=1; }; done
[ "$bad" = 0 ] && echo "all $(ls "$WORK"/old/*.ppm | wc -l) pages match the baseline"
exit $bad
