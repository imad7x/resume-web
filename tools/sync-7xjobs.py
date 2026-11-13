#!/usr/bin/env python3
"""Copy 7xjobs' reading rules into the builder: app/web/data/jobrules.js.

The job match and the role guess use the same skill and role rules as 7xjobs.com, so a skill the
builder finds in a resume is the skill 7xjobs counts in its jobs. Run after 7xjobs changes its
taxonomy (nobs/taxonomy.py):   python3 tools/sync-7xjobs.py
"""
import ast, json, os, urllib.request

API = os.environ.get("JOBS_API", "http://127.0.0.1:8095/api/v1")
TAXONOMY = os.environ.get("JOBS_TAXONOMY", "/docker/jobs/app/nobs/taxonomy.py")
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "web", "data", "jobrules.js")

skills = json.load(urllib.request.urlopen(API + "/skill-rules"))
rules = json.load(urllib.request.urlopen(API + "/role-rules"))
labels = {}
for node in ast.parse(open(TAXONOMY).read()).body:
    if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", "") == "ROLES":
        labels = {k: label for k, label, _ in ast.literal_eval(node.value)}
roles = [[k, labels.get(k, k), p] for k, p in rules]
with open(OUT, "w") as f:
    f.write("/* 7xjobs' reading rules (skills, roles), copied by tools/sync-7xjobs.py. Do not edit by hand. */\n")
    f.write("window.JOBRULES = " + json.dumps({"skills": skills, "roles": roles}, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(skills), "skills,", len(roles), "roles ->", os.path.normpath(OUT))
