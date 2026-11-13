/* Where resumes are kept. On the home server (the LAN app) RS.api talks to server.py. In the public
 * builder (<html data-public="1">, 7xjobs.com/resume/build) nothing is stored on a server: this device
 * store answers the same calls from the browser's IndexedDB, so the rest of the app does not change.
 * Only a PDF goes to the server, printed from memory and sent straight back (POST api/pdf).
 *
 * Stores: "resumes" (id -> doc), "trash" (key -> doc), "history" (id/stamp -> doc). One person, "me". */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const PUBLIC = document.documentElement.dataset.public === "1";
  RS.PUBLIC = PUBLIC;
  if (!PUBLIC) return;

  const ME = { id: "me", name: "" };
  const HISTORY_GAP = 10 * 60 * 1000, HISTORY_KEEP = 30;
  const DEFAULT_DESIGN = { template: "charcoal", accent: "", paper: "a4" };

  let dbp = null;
  function db() {
    dbp = dbp || new Promise((ok, bad) => {
      const req = indexedDB.open("7xresume", 1);
      req.onupgradeneeded = () => { for (const s of ["resumes", "trash", "history"]) req.result.createObjectStore(s); };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => bad(new Error("this browser won’t let the page keep data (private window?)"));
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((ok, bad) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let out;
      Promise.resolve(fn(s)).then((v) => { out = v; });
      t.oncomplete = () => ok(out);
      t.onerror = t.onabort = () => bad(t.error || new Error("storage failed"));
    });
  }
  const req = (r) => new Promise((ok, bad) => { r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
  const get = (store, key) => tx(store, "readonly", (s) => req(s.get(key)));
  const all = (store) => tx(store, "readonly", (s) => req(s.getAll()));
  const keys = (store) => tx(store, "readonly", (s) => req(s.getAllKeys()));
  const put = (store, key, val) => tx(store, "readwrite", (s) => { s.put(val, key); });
  const del = (store, key) => tx(store, "readwrite", (s) => { s.delete(key); });

  const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, "0")).join("");
  const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
  const fail = (status, error, data) => { const e = new Error(error); e.status = status; e.data = Object.assign({ error }, data); throw e; };
  const copy = (x) => JSON.parse(JSON.stringify(x));

  function summary(doc) {
    const work = doc.resume.work || [];
    return { id: doc.id, owner: ME.id, title: doc.title, updated: doc.updated, created: doc.created || doc.updated,
      template: doc.design.template, name: (doc.resume.basics || {}).name || "",
      jobs: work.length, points: work.reduce((n, w) => n + (w.highlights || []).length, 0) };
  }
  async function library() {
    const docs = (await all("resumes")).map(summary).sort((a, b) => (a.updated < b.updated ? 1 : -1));
    return { people: [ME], resumes: docs, trash: (await keys("trash")).length };
  }
  async function trashList() {
    const out = [];
    for (const key of await keys("trash")) {
      const doc = await get("trash", key);
      const m = /-(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)$/.exec(key);
      out.push(Object.assign(summary(doc), { key, ownerName: "", deleted: m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]).toISOString() : doc.updated }));
    }
    return out.sort((a, b) => (a.deleted < b.deleted ? 1 : -1));
  }
  async function keepVersion(doc, force) {
    const mine = (await keys("history")).filter((k) => k.startsWith(doc.id + "/")).sort();
    const last = mine[mine.length - 1];
    if (last && !force) {
      const m = /\/(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)$/.exec(last);
      if (m && Date.now() - new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) < HISTORY_GAP) return;
    }
    const key = doc.id + "/" + stamp();
    await put("history", key, doc);
    for (const old of mine.concat(key).sort().slice(0, Math.max(0, mine.length + 1 - HISTORY_KEEP))) await del("history", old);
  }
  const design = (d, base) => Object.assign({}, base || DEFAULT_DESIGN, d && typeof d === "object" ? d : {});

  /* The server's API, answered on this device. */
  async function device(path, body) {
    let m;
    if (path === "library") return library();
    if (path === "trash") return trashList();
    if (path === "templates") return null;                       // never here: core.js asks the server
    if (path === "resumes" && body) {
      const source = body.from ? await get("resumes", body.from) : null;
      if (body.from && !source) fail(404, "no such resume to copy");
      const content = source ? source.resume : body.resume || {};
      if (!content || typeof content !== "object") fail(400, "resume must be an object");
      const doc = { id: newId(), owner: ME.id, title: String(body.title || (source ? source.title + " (copy)" : "Resume")).trim().slice(0, 80),
        created: now(), updated: now(), rev: 1, design: design(body.design, source && source.design), resume: copy(content) };
      const target = body.target || (source || {}).target;
      if (target) doc.target = copy(target);
      await put("resumes", doc.id, doc);
      return doc;
    }
    if ((m = /^resumes\/([a-z0-9]+)\/history(?:\/(\d{8}-\d{6}))?$/.exec(path))) {
      if (m[2]) return (await get("history", m[1] + "/" + m[2])) || fail(404, "no such version");
      const out = [];
      for (const k of (await keys("history")).filter((k) => k.startsWith(m[1] + "/")).sort().reverse()) {
        const d = await get("history", k), s = summary(d);
        out.push({ version: k.split("/")[1], saved: d.updated, title: d.title, template: s.template, jobs: s.jobs, points: s.points });
      }
      return out;
    }
    if ((m = /^trash\/([a-z0-9-]+)\/(restore|delete)$/.exec(path))) {
      const doc = await get("trash", m[1]);
      if (!doc) fail(404, "not in the trash");
      await del("trash", m[1]);
      if (m[2] === "delete") {
        if (!(await keys("trash")).some((k) => k.startsWith(doc.id + "-")))
          for (const k of (await keys("history")).filter((k) => k.startsWith(doc.id + "/"))) await del("history", k);
        return library();
      }
      if (await get("resumes", doc.id)) doc.id = newId();
      doc.rev = (doc.rev || 0) + 1;
      doc.updated = now();
      await put("resumes", doc.id, doc);
      return Object.assign(await library(), { restored: doc.id });
    }
    if ((m = /^resumes\/([a-z0-9]+)(\/delete)?$/.exec(path))) {
      const doc = await get("resumes", m[1]);
      if (!doc) fail(404, "no such resume");
      if (!body) return doc;
      if (m[2]) {
        await put("trash", doc.id + "-" + stamp(), doc);
        await del("resumes", doc.id);
        return library();
      }
      if (body.rev !== doc.rev) fail(409, "changed elsewhere", { doc });
      const changed = Object.assign({}, doc);
      if ("title" in body) changed.title = String(body.title).trim().slice(0, 80) || doc.title;
      if ("design" in body) changed.design = design(body.design);
      if ("target" in body) { if (body.target) changed.target = body.target; else delete changed.target; }
      if ("resume" in body) {
        if (!body.resume || typeof body.resume !== "object") fail(400, "resume must be an object");
        changed.resume = body.resume;
      }
      await keepVersion(doc, !!body.checkpoint);
      changed.rev = doc.rev + 1;
      changed.updated = now();
      await put("resumes", doc.id, changed);
      return { rev: changed.rev, updated: changed.updated };
    }
    fail(404, "not available in the online builder");
  }

  /* The PDF: the server prints the resume it is sent and keeps nothing. */
  async function pdf(doc, win) {
    const res = await fetch("api/pdf", { method: "POST", headers: { "X-Resume": "1", "Content-Type": "application/json" },
      body: JSON.stringify({ title: doc.title, design: doc.design, resume: doc.resume }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "could not print");
    const blob = await res.blob();
    const name = /filename\*=UTF-8''([^;]+)/.exec(res.headers.get("Content-Disposition") || "");
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = name ? decodeURIComponent(name[1]) : "Resume.pdf";
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* Everything on this device as one file, and back. */
  async function backup() {
    return { app: "7xresume", saved: now(), resumes: await all("resumes"), trash: await all("trash") };
  }
  async function restoreBackup(data) {
    if (!data || data.app !== "7xresume" || !Array.isArray(data.resumes)) throw new Error("that isn’t a 7xResume backup file");
    let n = 0;
    for (const doc of data.resumes) {
      if (!doc || !doc.id || !doc.resume || !doc.design) continue;
      const mine = await get("resumes", doc.id);
      if (mine && mine.updated >= doc.updated) continue;       // keep the newer of the two
      await put("resumes", doc.id, Object.assign({}, doc, { owner: ME.id, rev: (mine ? mine.rev : doc.rev || 0) + 1 }));
      n++;
    }
    return n;
  }

  Object.assign(RS, { device, devicePdf: pdf, deviceBackup: backup, deviceRestore: restoreBackup });
})();
