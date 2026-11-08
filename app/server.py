"""Resume: a resume editor for everyone at home - several people, several copies each, many templates.

  GET  /                              the editor (web/: index.html, app.js, style.css, render.js, templates/, fonts/)
  GET  /print.html?id=&t=&paper=      one resume on its own, laid out for paper; the PDF is printed from it
  GET  /api/ping                      health check
  GET  /api/library                   the people and every resume (without its content)
  GET  /api/templates                 the template files in web/templates
  GET  /api/resumes/<id>              one resume
  GET  /api/resumes/<id>/pdf          its PDF; ?t=<template>&paper=a4|letter override the saved design
  GET  /api/resumes/<id>/history      the earlier versions kept; /history/<version> is one of them
  POST /api/resumes                   new resume: {owner, title, from: <id to copy>} or {owner, title, resume, design}
  POST /api/resumes/<id>              save: {rev, title?, owner?, design?, resume?}; a stale rev gets 409 and
                                      the stored copy
  POST /api/resumes/<id>/delete       move it to state/trash
  POST /api/people                    {name}; POST /api/people/<id> {name} renames, /api/people/<id>/delete
                                      removes someone with no resumes left
  POST /api/import/editor             body: an old Resume_Editor.html -> {"resume": ...} in JSON Resume form

A resume is stored as STATE_DIR/resumes/<id>.json: the content in the JSON
Resume schema (https://jsonresume.org/schema) under "resume", and the look
(template, accent colour, paper) under "design". Before a save overwrites a
copy, the stored one goes to STATE_DIR/history/<id>/ unless the newest kept
version is less than HISTORY_GAP old, so the editor can autosave every few
seconds and the history still holds one version per editing session.

A template is a file in web/templates (see render.js for what it gets); a
new file there shows up in the template picker on the next page load.

There are no logins: anyone who can open the page can edit. POSTs must carry
the header "X-Resume: 1". A browser only lets another site send a custom
header after a CORS preflight, which this server never approves, so no other
web page can write here. Every request must be addressed to an IP, localhost,
or a name in ALLOWED_HOSTS (closes DNS rebinding).
"""

import glob
import hashlib
import html
import ipaddress
import json
import logging
import mimetypes
import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8088"))
ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, "web")
TEMPLATES = os.path.join(WEB, "templates")
STATE_DIR = os.environ.get("STATE_DIR", "/state")
PEOPLE_FILE = os.path.join(STATE_DIR, "people.json")
RESUMES = os.path.join(STATE_DIR, "resumes")
HISTORY = os.path.join(STATE_DIR, "history")
TRASH = os.path.join(STATE_DIR, "trash")
PDF_CACHE = os.path.join(STATE_DIR, "pdf")
CHROMIUM = os.environ.get("CHROMIUM", "chromium-browser")

HISTORY_GAP = 10 * 60          # seconds between kept versions
HISTORY_KEEP = 200             # versions kept per resume
MAX_BODY = 2 * 1024 * 1024
PAPERS = ("a4", "letter")
DEFAULT_DESIGN = {"template": "charcoal", "accent": "", "paper": "a4"}

ID_RE = re.compile(r"^[a-z0-9]{4,24}$")
TEMPLATE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
COLOR_RE = re.compile(r"^(#[0-9a-fA-F]{6})?$")

ALLOWED_HOSTS = {name.strip().lower() for name in
                 os.environ.get("ALLOWED_HOSTS", "").split(",") if name.strip()}

log = logging.getLogger("resume")
lock = threading.Lock()
pdf_lock = threading.Lock()


def read_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    os.replace(tmp, path)


def now():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def new_id():
    return secrets.token_hex(5)


def resume_path(rid):
    return os.path.join(RESUMES, rid + ".json")


def load(rid):
    return read_json(resume_path(rid), None) if ID_RE.match(rid or "") else None


def people():
    return read_json(PEOPLE_FILE, [])


def templates():
    out = []
    for path in sorted(glob.glob(os.path.join(TEMPLATES, "*.js"))):
        tid = os.path.basename(path)[:-3]
        if TEMPLATE_RE.match(tid):
            out.append({"id": tid, "v": int(os.path.getmtime(path))})
    return out


def clean_design(design, base=None):
    """The design fields a client may set, checked; anything else is dropped."""
    out = dict(base or DEFAULT_DESIGN)
    if not isinstance(design, dict):
        return out
    if TEMPLATE_RE.match(str(design.get("template", ""))):
        out["template"] = design["template"]
    if COLOR_RE.match(str(design.get("accent", "x"))):
        out["accent"] = design["accent"]
    if design.get("paper") in PAPERS:
        out["paper"] = design["paper"]
    return out


def summary(doc):
    work = doc["resume"].get("work") or []
    return {"id": doc["id"], "owner": doc["owner"], "title": doc["title"], "updated": doc["updated"],
            "created": doc.get("created", doc["updated"]), "template": doc["design"]["template"],
            "name": (doc["resume"].get("basics") or {}).get("name", ""),
            "jobs": len(work), "points": sum(len(w.get("highlights") or []) for w in work)}


def library():
    docs = []
    for path in glob.glob(os.path.join(RESUMES, "*.json")):
        doc = read_json(path, None)
        if doc:
            docs.append(summary(doc))
    docs.sort(key=lambda d: d["updated"], reverse=True)
    return {"people": people(), "resumes": docs}


def keep_version(doc, force=False):
    """Copy the stored version into history unless the newest kept one is recent."""
    folder = os.path.join(HISTORY, doc["id"])
    os.makedirs(folder, exist_ok=True)
    kept = sorted(os.listdir(folder))
    if kept and not force:
        last = datetime.strptime(kept[-1][:15], "%Y%m%d-%H%M%S").timestamp()
        if time.time() - last < HISTORY_GAP:
            return
    name = datetime.now().strftime("%Y%m%d-%H%M%S") + ".json"
    write_json(os.path.join(folder, name), doc)
    kept = sorted(set(kept) | {name})
    for old in kept[:max(0, len(kept) - HISTORY_KEEP)]:
        os.remove(os.path.join(folder, old))


def history(rid):
    folder = os.path.join(HISTORY, rid)
    out = []
    for name in sorted(os.listdir(folder), reverse=True) if os.path.isdir(folder) else []:
        doc = read_json(os.path.join(folder, name), None)
        if doc:
            s = summary(doc)
            out.append({"version": name[:-5], "saved": doc["updated"], "title": doc["title"],
                        "template": s["template"], "jobs": s["jobs"], "points": s["points"]})
    return out


# ------------------------------------------------------------- old editor import
MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def month_iso(text):
    """'December 2024' / 'Dec-2016' / '-Jun-2016' -> '2024-12'; 'Present' -> ''; else the text as it is."""
    t = text.strip().strip("-").strip()
    if not t or t.lower() in ("present", "current", "now"):
        return ""
    m = re.match(r"^([A-Za-z]+)[\s\-./,]+(\d{4})$", t)
    if m and m.group(1)[:3].lower() in MONTHS:
        return "%s-%02d" % (m.group(2), MONTHS.index(m.group(1)[:3].lower()) + 1)
    return t


def html_text(fragment):
    """innerHTML from the old editor -> text, keeping bold as **...**."""
    s = re.sub(r"</?(b|strong)\b[^>]*>", "**", fragment or "", flags=re.I)
    s = re.sub(r"<br\s*/?>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).replace(" ", " ").replace("****", "")
    return re.sub(r"\s+", " ", s).strip()


def import_editor(src):
    """Read the data out of a Resume_Editor.html (as first written, or as re-saved by its Save button)."""
    def array(name):
        m = re.search(r"const %s = (\[[\s\S]*?\]);\s*\n" % name, src)
        if not m:
            return []
        txt = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', m.group(1))
        return json.loads(txt)

    def field(fid):
        m = re.search(r'id="%s"[^>]*>(.*?)</(?:span|div)>' % fid, src, re.S)
        return html_text(m.group(1)) if m else ""

    def company(text):
        return text + ")" if text.count("(") > text.count(")") else text

    parts = [p.strip() for p in field("r-city").split(",")]
    location = {"city": parts[0]} if parts[0] else {}
    if len(parts) > 1 and parts[-1]:
        location["countryCode"] = parts[-1]
    school, degree, year = field("r-school"), field("r-degree"), field("r-gradyear")
    return {
        "basics": {"name": " ".join(x for x in (field("r-fname"), field("r-lname")) if x),
                   "label": field("r-title"), "email": field("r-email"), "phone": field("r-phone"),
                   "url": "", "summary": field("r-summary"), "location": location, "profiles": []},
        "work": [{"name": company(html_text(j.get("company"))), "position": html_text(j.get("title")),
                  "startDate": month_iso(html_text(j.get("start"))), "endDate": month_iso(html_text(j.get("end"))),
                  "highlights": [b for b in (html_text(x) for x in j.get("bullets", [])) if b]}
                 for j in array("JOBS")],
        "education": [{"institution": school, "studyType": degree, "area": "", "startDate": "",
                       "endDate": month_iso(year)}] if school or degree else [],
        "certificates": [{"name": c} for c in (html_text(x) for x in array("CERTS")) if c],
        "skills": [{"name": html_text(g.get("title")), "keywords": [k for k in map(html_text, g.get("items", [])) if k]}
                   for g in array("SKILL_GROUPS")],
    }


# ------------------------------------------------------------------------- PDF
def pdf_name(doc):
    """'<Name> Resume.pdf'; the copy's own title stays out of it, it is a label for the library only."""
    name = (doc["resume"].get("basics") or {}).get("name") or ""
    return (re.sub(r'[\\/:*?"<>|]+', " ", name).strip() + " Resume").strip() + ".pdf"


def make_pdf(doc, template, paper):
    """Print /print.html for this resume with headless Chromium; the result is cached per content."""
    tpl = os.path.join(TEMPLATES, template + ".js")
    if not os.path.exists(tpl):
        raise FileNotFoundError(template)
    parts = [json.dumps(doc, sort_keys=True), template, paper]
    for path in (tpl, os.path.join(WEB, "render.js"), os.path.join(WEB, "print.html")):
        parts.append(str(os.path.getmtime(path)))
    key = hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]
    out = os.path.join(PDF_CACHE, f"{doc['id']}-{key}.pdf")
    if os.path.exists(out):
        return out
    query = urllib.parse.urlencode({"id": doc["id"], "t": template, "paper": paper, "pdf": 1})
    with pdf_lock, tempfile.TemporaryDirectory() as profile:
        tmp = os.path.join(profile, "out.pdf")
        cmd = [CHROMIUM, "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
               "--no-first-run", "--hide-scrollbars", f"--user-data-dir={profile}",
               "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
               "--virtual-time-budget=10000", f"--print-to-pdf={tmp}",
               f"http://127.0.0.1:{PORT}/print.html?{query}"]
        started = time.time()
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=90,
                             env={**os.environ, "HOME": profile})
        if not os.path.exists(tmp) or os.path.getsize(tmp) == 0:
            raise RuntimeError("chromium made no PDF: " + res.stderr[-500:])
        for old in glob.glob(os.path.join(PDF_CACHE, doc["id"] + "-*.pdf")):
            os.remove(old)
        shutil.move(tmp, out)
    log.info("pdf %s %s %s in %.1fs", doc["id"], template, paper, time.time() - started)
    return out


def host_allowed(header):
    host = (header or "").strip().lower()
    if host.startswith("["):
        host = host[1:].split("]", 1)[0]
    elif host.count(":") == 1:
        host = host.split(":", 1)[0]
    if not host:
        return False
    if host == "localhost" or host in ALLOWED_HOSTS:
        return True
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


class Handler(BaseHTTPRequestHandler):
    server_version = "resume"
    sys_version = ""

    def log_message(self, fmt, *args):
        pass

    def send(self, code, body, ctype="application/json", cache="no-cache", extra=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        if ctype.startswith("text/html"):
            # Templates style themselves through constructed stylesheets (CSSOM),
            # which style-src 'self' allows; the preview is a same-origin frame.
            self.send_header("Content-Security-Policy",
                             "default-src 'self'; img-src 'self' data: blob:; object-src 'none'; "
                             "base-uri 'none'; frame-ancestors 'self'")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not host_allowed(self.headers.get("Host")):
            return self.send(421, {"error": "unknown host"})
        url = urllib.parse.urlsplit(self.path)
        path, query = url.path, urllib.parse.parse_qs(url.query)
        try:
            if path == "/api/ping":
                return self.send(200, {"ok": True})
            if path == "/api/library":
                return self.send(200, library())
            if path == "/api/templates":
                return self.send(200, templates())
            m = re.match(r"^/api/resumes/([a-z0-9]+)(/pdf|/history(?:/(\d{8}-\d{6}))?)?$", path)
            if m:
                doc = load(m.group(1))
                if not doc:
                    return self.send(404, {"error": "no such resume"})
                if not m.group(2):
                    return self.send(200, doc)
                if m.group(2) == "/pdf":
                    return self.pdf(doc, query)
                if m.group(3):
                    old = read_json(os.path.join(HISTORY, doc["id"], m.group(3) + ".json"), None)
                    return self.send(200, old) if old else self.send(404, {"error": "no such version"})
                return self.send(200, history(doc["id"]))
            return self.static(path)
        except Exception:
            log.exception("GET %s", path)
            return self.send(500, {"error": "server error"})

    def pdf(self, doc, query):
        template = (query.get("t") or [doc["design"]["template"]])[0]
        paper = (query.get("paper") or [doc["design"]["paper"]])[0]
        if not TEMPLATE_RE.match(template) or paper not in PAPERS:
            return self.send(400, {"error": "bad template or paper"})
        try:
            path = make_pdf(doc, template, paper)
        except FileNotFoundError:
            return self.send(404, {"error": "no such template"})
        name = pdf_name(doc)
        ascii_name = name.encode("ascii", "replace").decode().replace("?", "_")
        disp = "inline" if query.get("view") else "attachment"
        with open(path, "rb") as f:
            return self.send(200, f.read(), "application/pdf", extra={
                "Content-Disposition": f"{disp}; filename=\"{ascii_name}\"; "
                                       f"filename*=UTF-8''{urllib.parse.quote(name)}"})

    def static(self, path):
        rel = "index.html" if path in ("/", "") else urllib.parse.unquote(path).lstrip("/")
        full = os.path.realpath(os.path.join(WEB, rel))
        if not full.startswith(WEB + os.sep) or not os.path.isfile(full):
            return self.send(404, {"error": "not found"})
        ctype = {".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml",
                 ".webmanifest": "application/manifest+json", ".html": "text/html; charset=utf-8"}.get(
            os.path.splitext(full)[1]) or mimetypes.guess_type(full)[0] or "application/octet-stream"
        cache = "max-age=604800" if "/fonts/" in full else "no-cache"
        with open(full, "rb") as f:
            return self.send(200, f.read(), ctype, cache)

    def body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not 0 <= length <= MAX_BODY:
            raise ValueError("body too large")
        raw = self.rfile.read(length) if length else b""
        if self.headers.get("Content-Type", "").startswith("application/json"):
            data = json.loads(raw or b"{}")
            if not isinstance(data, dict):
                raise ValueError("body must be an object")
            return data
        return raw.decode("utf-8", "replace")

    def do_POST(self):
        if not host_allowed(self.headers.get("Host")):
            return self.send(421, {"error": "unknown host"})
        if self.headers.get("X-Resume") != "1":
            return self.send(403, {"error": "missing X-Resume header"})
        path = urllib.parse.urlsplit(self.path).path
        try:
            body = self.body()
        except (ValueError, UnicodeDecodeError):
            return self.send(400, {"error": "bad body"})
        try:
            with lock:
                return self.post(path, body)
        except Exception:
            log.exception("POST %s", path)
            return self.send(500, {"error": "server error"})

    def post(self, path, body):
        if path == "/api/import/editor":
            if not isinstance(body, str) or "const JOBS" not in body:
                return self.send(400, {"error": "that is not a Resume_Editor.html file"})
            return self.send(200, {"resume": import_editor(body)})
        if not isinstance(body, dict):
            return self.send(400, {"error": "send JSON"})

        if path == "/api/people":
            name = str(body.get("name", "")).strip()[:40]
            if not name:
                return self.send(400, {"error": "need a name"})
            plist = people()
            plist.append({"id": new_id(), "name": name})
            write_json(PEOPLE_FILE, plist)
            return self.send(200, library())
        m = re.match(r"^/api/people/([a-z0-9]+)(/delete)?$", path)
        if m:
            plist = people()
            person = next((p for p in plist if p["id"] == m.group(1)), None)
            if not person:
                return self.send(404, {"error": "no such person"})
            if m.group(2):
                if any(r["owner"] == person["id"] for r in library()["resumes"]):
                    return self.send(409, {"error": "delete or move their resumes first"})
                plist.remove(person)
            else:
                name = str(body.get("name", "")).strip()[:40]
                if not name:
                    return self.send(400, {"error": "need a name"})
                person["name"] = name
            write_json(PEOPLE_FILE, plist)
            return self.send(200, library())

        if path == "/api/resumes":
            owner = str(body.get("owner", ""))
            if not any(p["id"] == owner for p in people()):
                return self.send(400, {"error": "unknown person"})
            source = load(str(body.get("from", ""))) if body.get("from") else None
            if body.get("from") and not source:
                return self.send(404, {"error": "no such resume to copy"})
            content = source["resume"] if source else body.get("resume") or {}
            if not isinstance(content, dict):
                return self.send(400, {"error": "resume must be an object"})
            design = clean_design(body.get("design"), source["design"] if source else None)
            title = str(body.get("title") or (source["title"] + " (copy)" if source else "Resume")).strip()[:80]
            doc = {"id": new_id(), "owner": owner, "title": title, "created": now(), "updated": now(),
                   "rev": 1, "design": design, "resume": content}
            write_json(resume_path(doc["id"]), doc)
            return self.send(200, doc)

        m = re.match(r"^/api/resumes/([a-z0-9]+)(/delete)?$", path)
        if not m:
            return self.send(404, {"error": "not found"})
        doc = load(m.group(1))
        if not doc:
            return self.send(404, {"error": "no such resume"})
        if m.group(2):
            os.makedirs(TRASH, exist_ok=True)
            os.replace(resume_path(doc["id"]), os.path.join(
                TRASH, f"{doc['id']}-{datetime.now():%Y%m%d-%H%M%S}.json"))
            return self.send(200, library())
        if body.get("rev") != doc["rev"]:
            return self.send(409, {"error": "changed elsewhere", "doc": doc})
        changed = dict(doc)
        if "title" in body:
            changed["title"] = str(body["title"]).strip()[:80] or doc["title"]
        if "owner" in body:
            if not any(p["id"] == body["owner"] for p in people()):
                return self.send(400, {"error": "unknown person"})
            changed["owner"] = body["owner"]
        if "design" in body:
            changed["design"] = clean_design(body["design"], doc["design"])
        if "resume" in body:
            if not isinstance(body["resume"], dict):
                return self.send(400, {"error": "resume must be an object"})
            changed["resume"] = body["resume"]
        keep_version(doc, force=bool(body.get("checkpoint")))
        changed["rev"] = doc["rev"] + 1
        changed["updated"] = now()
        write_json(resume_path(doc["id"]), changed)
        return self.send(200, {"rev": changed["rev"], "updated": changed["updated"]})


def main():
    logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(asctime)s %(name)s %(message)s")
    for folder in (RESUMES, HISTORY, PDF_CACHE):
        os.makedirs(folder, exist_ok=True)
    log.info("%d people, %d resumes, %d templates; serving on :%d",
             len(people()), len(glob.glob(os.path.join(RESUMES, "*.json"))), len(templates()), PORT)
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
