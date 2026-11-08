/* Resume editor.
 *
 * #/            the library: whose resumes (one tab per person) and their copies
 * #/r/<id>      the editor: sections on the left, one section's form in the
 *               middle, the page preview on the right
 *
 * Edits save themselves a moment after typing stops; the server keeps one
 * older version per editing session (History). The preview, the library
 * thumbnails and the template gallery draw the resume straight into this
 * page, each in a shadow root of its own (Resume.mount in render.js), so a
 * keystroke shows on the page in the same frame.
 */
(function () {
  "use strict";

  const S = {
    lib: { people: [], resumes: [] },
    person: null,
    doc: null,              // the open resume
    section: "work",        // the section shown in the editor
    open: new Set(),        // entries (objects) expanded in the editor
    seq: 0,                 // bumped on every edit
    savedSeq: 0,
    saving: null,
    saveTimer: 0,
    viewing: null,          // an old version shown in the preview instead of the current one
  };
  const $app = document.getElementById("app");
  const $dlg = document.getElementById("dlg");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.2, .7, .2, 1)";
  const DATA = new WeakMap();     // editor node -> the object it edits (entry, skill group)
  const NODE = new WeakMap();     // and back

  // ---------------------------------------------------------------- helpers
  const ICON = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    up: '<path d="M12 19V5m0 0-6 6m6-6 6 6"/>',
    down: '<path d="M12 5v14m0 0-6-6m6 6 6-6"/>',
    grip: '<circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    back: '<path d="M15 18 9 12l6-6"/>',
    left: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
    right: '<path d="M5 12h14m0 0-6-6m6 6-6 6"/>',
    download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.4-9-7.4Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    upload: '<path d="M12 20V9m0 0-4 4m4-4 4 4M5 4h14"/>',
    file: '<path d="M14 3H6v18h12V7l-4-4Z"/><path d="M14 3v4h4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    logo: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12h6M10 16h6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    skills: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 21l5-3 5 3-1.5-7"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  };
  const FILLED = new Set(["grip", "more"]);
  function icon(name, cls) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("fill", FILLED.has(name) ? "currentColor" : "none");
    s.setAttribute("stroke", FILLED.has(name) ? "none" : "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    if (cls) s.setAttribute("class", cls);
    s.innerHTML = ICON[name];
    return s;
  }

  /* el("div.a.b#id", {on: {click}, attrs: {...}, value, text}, ...children) */
  function el(spec, props, ...kids) {
    const [head, id] = spec.split("#");
    const [tag, ...classes] = head.split(".");
    const n = document.createElement(tag || "div");
    if (classes.length) n.className = classes.join(" ");
    if (id) n.id = id;
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "on") for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
      else if (k === "attrs") for (const [a, av] of Object.entries(v)) { if (av != null && av !== false) n.setAttribute(a, av === true ? "" : av); }
      else if (k === "text") n.textContent = v;
      else n[k] = v;
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return n;
  }
  const dots = (cls) => (cls ? "." + cls.trim().split(/\s+/).join(".") : "");
  const btn = (label, cls, onclick, ico, title) => el("button.btn" + dots(cls),
    { type: "button", on: { click: onclick }, attrs: { title } }, ico ? icon(ico) : null, label);
  const iconBtn = (ico, title, onclick, cls) => el("button.icon-btn" + dots(cls),
    { type: "button", on: { click: onclick }, attrs: { title, "aria-label": title } }, icon(ico));
  const grip = (title) => el("span.grip", { attrs: { title: title || "Drag to reorder" } }, icon("grip"));

  async function api(path, body, type) {
    const opts = { headers: {} };
    if (body !== undefined) {
      opts.method = "POST";
      opts.headers["X-Resume"] = "1";
      opts.headers["Content-Type"] = type || "application/json";
      opts.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    const res = await fetch("api/" + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || "request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function monthText(d) {
    const m = /^(\d{4})-(\d{2})/.exec(d || "");
    return m ? MONTHS[+m[2] - 1] + " " + m[1] : (d || "");
  }
  function span(item, present) {
    const a = monthText(item.startDate), b = item.endDate ? monthText(item.endDate) : (present && a ? "Present" : "");
    return a && b ? a + " – " + b : a || b;
  }
  const thisMonth = () => new Date().toISOString().slice(0, 7);
  function ago(iso) {
    const t = new Date(iso), s = (Date.now() - t) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    const time = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (t >= today) return "today " + time;
    if (t >= today - 864e5) return "yesterday " + time;
    return t.toLocaleDateString([], { day: "numeric", month: "short", year: t.getFullYear() === today.getFullYear() ? undefined : "numeric" });
  }
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  const clean = (s) => String(s || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();

  function autosize(ta) {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + 2 + "px";
  }
  const autosizeAll = (root) => requestAnimationFrame(() => root.querySelectorAll("textarea").forEach(autosize));

  /* Slide `nodes` from where they were to where `mutate` puts them. */
  function flip(nodes, mutate) {
    const first = new Map(nodes.map((n) => [n, n.getBoundingClientRect()]));
    mutate();
    if (calm.matches) return;
    for (const n of nodes) {
      if (!n.isConnected) continue;
      for (const a of n.getAnimations()) if (a.id === "flip") a.cancel();
      const a = first.get(n), b = n.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) continue;
      n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 220, easing: EASE, id: "flip" });
    }
  }

  function pulse(node) {
    node.classList.remove("pulse");
    void node.offsetWidth;
    node.classList.add("pulse");
    setTimeout(() => node.classList.remove("pulse"), 1300);
  }

  /* Remove `node` with a short fade, then run `after`. */
  function vanish(node, after) {
    if (calm.matches) { node.remove(); if (after) after(); return; }
    node.classList.add("leaving");
    node.addEventListener("animationend", () => { node.remove(); if (after) after(); }, { once: true });
  }

  let toastTimer = 0;
  function toast(msg, action, fn) {
    const t = document.getElementById("toast");
    t.replaceChildren(el("span", { text: msg }));
    if (action) t.append(el("button", { type: "button", text: action, on: { click: () => { t.classList.add("off"); fn(); } } }));
    t.hidden = false;
    t.classList.remove("off");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("off"), action ? 6000 : 2600);
  }

  function closeMenus() { document.querySelectorAll(".menu").forEach((m) => m.remove()); }
  function menu(anchor, items) {
    closeMenus();
    const m = el("div.menu", { attrs: { role: "menu" } }, items.filter(Boolean).map((it) =>
      it === "-" ? el("hr") : it.label && !it.fn ? el("div.menu-label", { text: it.label })
        : el("button" + (it.danger ? ".danger" : ""), { type: "button", disabled: it.disabled,
          on: { click: () => { m.remove(); it.fn(); } } }, it.icon ? icon(it.icon) : null, it.label)));
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
    m.style.top = (r.bottom + 4 + h > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + "px";
    setTimeout(() => document.addEventListener("pointerdown", function off(e) {
      if (!m.contains(e.target)) { m.remove(); document.removeEventListener("pointerdown", off, true); }
    }, true));
  }

  /* A dialog; resolves with what `ok` returns, or null when cancelled. */
  function dialog({ title, text, body, okLabel, okClass, ok, cancelLabel }) {
    return new Promise((resolve) => {
      const done = (v) => { $dlg.close(); resolve(v); };
      const okBtn = okLabel ? btn(okLabel, okClass || "primary", async () => {
        try {
          const v = ok ? await ok() : true;
          if (v !== undefined) done(v);
        } catch (err) { toast(err.message); }
      }) : null;
      $dlg.replaceChildren(el("form", { method: "dialog", on: { submit: (e) => { e.preventDefault(); if (okBtn) okBtn.click(); } } },
        el("div.dlg-head", {}, el("h2", { text: title }), text ? el("p", { text }) : null),
        body ? el("div.dlg-body", {}, body) : null,
        el("div.dlg-foot", {}, btn(cancelLabel || "Cancel", "ghost", () => done(null)), okBtn)));
      $dlg.onclose = () => resolve(null);
      $dlg.showModal();
      const first = $dlg.querySelector("input:not([type=radio]):not([type=file]), select, textarea");
      if (first) first.focus();
    });
  }
  const confirmBox = (title, text, okLabel) => dialog({ title, text, okLabel: okLabel || "Delete", okClass: "primary" });
  function promptBox(title, label, value, okLabel) {
    const input = el("input", { value: value || "", attrs: { maxlength: 80 } });
    return dialog({ title, body: el("label.field", {}, el("span", { text: label }), input), okLabel: okLabel || "Save",
      ok: () => input.value.trim() || undefined });
  }

  /* Swap the page for another view, cross-fading where the browser can. */
  function swap(fn) {
    if (document.startViewTransition && !calm.matches && $app.childElementCount) document.startViewTransition(fn);
    else fn();
  }

  // --------------------------------------------------------------- sortable
  /* Drag to reorder. The items are the children of `box` matching opts.item.
   * A drag starts from opts.handle, or (without one) anywhere on the item but
   * its inputs and buttons, once the pointer has moved a few px; a plain
   * click stays a click. Boxes with the same opts.group trade items.
   * opts.drop(item, fromBox, toBox) runs once the item is in its new place. */
  function sortable(box, opts) {
    box.dataset.sort = opts.group || "";
    box.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const item = e.target.closest(opts.item);
      if (!item || item.parentElement !== box) return;
      if (opts.handle ? !e.target.closest(opts.handle) : e.target.closest("input, textarea, button, select")) return;
      if (opts.handle) e.preventDefault();
      drag(e, item, box, opts);
    });
  }

  function drag(e0, item, from, opts) {
    const x0 = e0.clientX, y0 = e0.clientY, pid = e0.pointerId;
    let box = from, ph = null, started = false, raf = 0, last = e0, scroller = null;

    const itemsOf = (b) => [...b.children].filter((c) => c !== item && c !== ph && c.matches(opts.item) && !c.classList.contains("leaving"));
    function begin() {
      started = true;
      const r = item.getBoundingClientRect();
      ph = el("div.sort-ph");
      ph.style.height = r.height + "px";
      if (opts.wrap) ph.style.width = r.width + "px";
      item.before(ph);
      Object.assign(item.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
      item.classList.add("sort-drag");
      document.body.classList.add("sorting");
      scroller = from.closest(".form-pane, .drawer-body");
      tick();
    }
    function place(x, y) {
      let target = box;
      if (opts.group) {
        const under = document.elementFromPoint(x, y);
        const b = under && under.closest(`[data-sort="${opts.group}"]`);
        if (b) target = b;
      }
      const items = itemsOf(target);
      let idx = items.length;
      for (let i = 0; i < items.length; i++) {
        const c = items[i];
        const r = c.getBoundingClientRect();
        const t = c.getAnimations().find((a) => a.id === "flip") ? layoutRect(c) : r;
        if (opts.wrap ? (y < t.top || (y <= t.bottom && x < t.left + t.width / 2)) : y < t.top + t.height / 2) { idx = i; break; }
      }
      const now = ph.parentElement === target
        ? [...target.children].filter((c) => c === ph || (c !== item && c.matches(opts.item))).indexOf(ph) : -1;
      if (now === idx) return;
      const moving = [...new Set([...itemsOf(box), ...items])];
      flip(moving, () => {
        if (idx < items.length) items[idx].before(ph);
        else if (items.length) items[items.length - 1].after(ph);
        else target.prepend(ph);
      });
      box = target;
    }
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!scroller) return;
      const r = scroller.getBoundingClientRect(), y = last.clientY, edge = 70;
      let v = 0;
      if (y < r.top + edge) v = -Math.ceil((r.top + edge - y) / 5);
      else if (y > r.bottom - edge) v = Math.ceil((y - r.bottom + edge) / 5);
      if (v) { scroller.scrollTop += v; place(last.clientX, last.clientY); }
    }
    function move(e) {
      if (e.pointerId !== pid) return;
      last = e;
      if (!started) {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < 5) return;
        begin();
      }
      e.preventDefault();
      item.style.transform = `translate(${e.clientX - x0}px, ${e.clientY - y0}px)`;
      place(e.clientX, e.clientY);
    }
    function end(e) {
      if (e.pointerId !== pid) return;
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
      if (!started) return;
      cancelAnimationFrame(raf);
      // the click that follows a drag is not a click
      const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener("click", eat, true);
      setTimeout(() => removeEventListener("click", eat, true), 0);
      const was = item.getBoundingClientRect();
      item.classList.remove("sort-drag");
      for (const k of ["left", "top", "width", "height", "transform"]) item.style[k] = "";
      ph.replaceWith(item);
      document.body.classList.remove("sorting");
      if (!calm.matches) {
        const now = item.getBoundingClientRect();
        item.animate([{ transform: `translate(${was.left - now.left}px, ${was.top - now.top}px)` }, { transform: "none" }],
          { duration: 180, easing: EASE });
      }
      opts.drop(item, from, box);
    }
    addEventListener("pointermove", move, { passive: false });
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }

  /* Where `n` sits in the layout, ignoring a slide in progress. */
  function layoutRect(n) {
    const p = n.offsetParent;
    const pr = p ? p.getBoundingClientRect() : { left: 0, top: 0 };
    const left = pr.left + (p ? p.clientLeft - p.scrollLeft : 0) + n.offsetLeft;
    const top = pr.top + (p ? p.clientTop - p.scrollTop : 0) + n.offsetTop;
    return { left, top, width: n.offsetWidth, height: n.offsetHeight, right: left + n.offsetWidth, bottom: top + n.offsetHeight };
  }

  // -------------------------------------------------------------- templates
  let templatesReady = null;
  function loadTemplates() {
    templatesReady = templatesReady || api("templates").then((list) => Promise.all(list.map((t) => new Promise((resolve) => {
      const s = el("script", { src: "templates/" + t.id + ".js?v=" + t.v });
      s.onload = s.onerror = resolve;
      document.head.append(s);
    }))));
    return templatesReady;
  }
  const tplList = () => Object.values(Resume.templates)
    .sort((a, b) => (a.order || 100) - (b.order || 100) || a.name.localeCompare(b.name));
  const tplDef = (id) => Resume.templates[id] || { id, name: id, width: 794, description: "" };

  /* Draw a resume into `host` scaled to `box`'s width (thumbnails, gallery). */
  function miniature(host, box, resume, design) {
    const def = Resume.templates[design.template];
    if (!def) return;
    const draw = host._draw || (host._draw = Resume.mount(host));
    try { draw(resume, design); } catch (e) { return; }
    const fit = () => {
      if (!box.clientWidth) return;
      host.style.width = def.width + "px";
      host.style.transform = `scale(${box.clientWidth / def.width})`;
    };
    fit();
    if (!host._ro) { host._ro = new ResizeObserver(fit); host._ro.observe(box); }
    host.classList.add("drawn");
  }

  // ------------------------------------------------------------------ data
  const BLANK = () => ({
    basics: { name: "", label: "", email: "", phone: "", url: "", summary: "", location: { city: "", countryCode: "" }, profiles: [] },
    work: [], education: [], certificates: [], skills: [], projects: [], languages: [],
  });

  /* Make sure everything the form binds to exists; keep anything else as it is. */
  function normalise(r) {
    const base = BLANK();
    r = r && typeof r === "object" ? r : {};
    r.basics = Object.assign(base.basics, r.basics || {});
    r.basics.location = Object.assign({ city: "", countryCode: "" }, r.basics.location || {});
    if (!Array.isArray(r.basics.profiles)) r.basics.profiles = [];
    for (const k of ["work", "education", "certificates", "skills", "projects", "languages"]) {
      if (!Array.isArray(r[k])) r[k] = [];
      r[k] = r[k].filter((x) => x && typeof x === "object");
    }
    for (const w of r.work.concat(r.projects)) if (!Array.isArray(w.highlights)) w.highlights = [];
    for (const g of r.skills) if (!Array.isArray(g.keywords)) g.keywords = [];
    return r;
  }

  function personName(id) {
    const p = S.lib.people.find((x) => x.id === id);
    return p ? p.name : "";
  }

  // ------------------------------------------------------------------ saving
  function changed(opts) {
    S.seq++;
    setStatus("Edited", "");
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(save, 800);
    if (!(opts && opts.noPreview)) drawPreview();
    updateRail();
  }

  async function save(checkpoint) {
    clearTimeout(S.saveTimer);
    if (!S.doc) return;
    if (S.saving) { await S.saving.catch(() => {}); if (S.seq === S.savedSeq && !checkpoint) return; }
    const doc = S.doc, seq = S.seq;
    if (seq === S.savedSeq && !checkpoint) return;
    const slow = setTimeout(() => setStatus("Saving…", "busy"), 300);
    S.saving = api("resumes/" + doc.id, { rev: doc.rev, title: doc.title, design: doc.design, resume: doc.resume,
      checkpoint: !!checkpoint });
    try {
      const res = await S.saving;
      if (S.doc !== doc) return;
      doc.rev = res.rev;
      doc.updated = res.updated;
      S.savedSeq = seq;
      if (S.seq === seq) setStatus("Saved", "ok");
      else S.saveTimer = setTimeout(save, 400);
    } catch (err) {
      if (err.status === 409) return conflict(err.data.doc);
      setStatus("Not saved – retrying", "bad");
      S.saveTimer = setTimeout(save, 5000);
    } finally {
      clearTimeout(slow);
      S.saving = null;
    }
  }
  const flush = () => (S.doc && (S.seq !== S.savedSeq || S.saving) ? save() : Promise.resolve());

  async function conflict(theirs) {
    setStatus("Changed elsewhere", "bad");
    const keepMine = await dialog({
      title: "This resume was changed somewhere else",
      text: `Another tab or device saved it ${ago(theirs.updated)}. Keep your version here, or load theirs (yours stays in History either way).`,
      okLabel: "Keep mine", cancelLabel: "Load theirs",
    });
    if (keepMine) {
      S.doc.rev = theirs.rev;
      save(true);
    } else {
      S.doc = theirs;
      normalise(S.doc.resume);
      S.seq = S.savedSeq = 0;
      renderEditor();
    }
  }

  function setStatus(text, cls) {
    const s = document.getElementById("status");
    if (!s || (s.textContent === text && s.className === "status " + cls)) return;
    s.textContent = text;
    s.className = "status " + cls;
  }

  addEventListener("beforeunload", (e) => {
    if (S.doc && S.seq !== S.savedSeq) {
      fetch("api/resumes/" + S.doc.id, { method: "POST", keepalive: true,
        headers: { "X-Resume": "1", "Content-Type": "application/json" },
        body: JSON.stringify({ rev: S.doc.rev, title: S.doc.title, design: S.doc.design, resume: S.doc.resume }) });
      e.preventDefault();
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (S.doc) save(true).then(() => toast("Saved, and kept as a version in History"));
    } else if (e.key === "Escape" && !$dlg.open) {
      closeMenus();
      closeDesign();
    }
  });

  // ---------------------------------------------------------------- routing
  async function route() {
    closeMenus();
    await flush();
    const m = /^#\/r\/([a-z0-9]+)/.exec(location.hash);
    if (m) return openResume(m[1]);
    S.doc = null;
    S.viewing = null;
    pv = null;
    await refreshLibrary();
    swap(renderLibrary);
  }
  addEventListener("hashchange", route);

  async function refreshLibrary() {
    S.lib = await api("library");
    if (!S.lib.people.some((p) => p.id === S.person)) {
      const saved = store.get("person");
      S.person = (S.lib.people.find((p) => p.id === saved) || S.lib.people[0] || {}).id || null;
    }
  }

  // ---------------------------------------------------------------- library
  const brand = () => el("a.brand", { href: "#/" }, el("span.mark", {}, icon("logo")), el("span", { text: "Resume" }));
  const thumbs = new Map();     // id -> {updated, doc}

  function renderLibrary() {
    document.title = "Resume";
    document.body.classList.remove("editing");
    const who = personName(S.person);
    const tabs = el("nav.tabs", { attrs: { "aria-label": "Whose resumes" } },
      S.lib.people.map((p) => el("button.tab" + (p.id === S.person ? ".on" : ""), {
        type: "button", text: p.name, on: { click: () => {
          if (p.id === S.person) return;
          S.person = p.id;
          store.set("person", p.id);
          renderLibrary();
        } } })),
      el("button.tab.add", { type: "button", attrs: { title: "Add a person", "aria-label": "Add a person" },
        on: { click: addPerson } }, icon("plus")));

    const mine = S.lib.resumes.filter((r) => r.owner === S.person);
    let body;
    if (!S.lib.people.length) {
      body = el("div.empty", {}, el("p", { text: "Add the first person to start a resume." }), btn("Add a person", "primary", addPerson, "user"));
    } else {
      body = el("div.cards", {}, mine.map(card),
        el("button.card.new", { type: "button", on: { click: newResume } },
          el("div", {}, el("div.plus", {}, icon("plus")), mine.length ? "New resume" : `Start ${who}’s first resume`)));
    }
    $app.replaceChildren(
      el("header.topbar", {}, brand(), S.lib.people.length ? tabs : null,
        who ? iconBtn("more", "Rename or remove " + who, (e) => personMenu(e.currentTarget, S.lib.people.find((p) => p.id === S.person))) : null),
      el("main.lib", {},
        S.lib.people.length ? el("div.lib-head", {},
          el("div", {}, el("h1", { text: who ? who + "’s resumes" : "Resumes" }),
            el("p", { text: mine.length ? `${plural(mine.length, "copy")}, one for each kind of job. Open one to edit it.` : "Copies for different kinds of job live here." })),
          btn("Import file", "", importFile, "upload", "A Resume_Editor.html or a JSON Resume .json file"),
          btn("New resume", "primary", newResume, "plus")) : null,
        body));
  }

  function card(r) {
    const def = tplDef(r.template);
    const host = el("div.host");
    const thumb = el("div.thumb", {}, host);
    const open = () => { location.hash = "#/r/" + r.id; };
    const node = el("article.card", { tabIndex: 0, on: {
      click: (e) => { if (!e.target.closest("button")) open(); },
      keydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) open(); },
    } },
      thumb,
      el("div.card-body", {},
        el("div.card-title", { text: r.title }),
        el("div.card-meta", { text: `${def.name} · ${plural(r.jobs, "job")} · ${plural(r.points, "point")}` }),
        el("div.card-meta", { text: "Edited " + ago(r.updated) })),
      el("div.card-actions", {},
        btn("Edit", "small soft", open, "edit"),
        btn("PDF", "small ghost", () => { location.href = `api/resumes/${r.id}/pdf`; }, "download", "Download PDF"),
        el("span.spacer"),
        iconBtn("more", "More", (e) => cardMenu(e.currentTarget, r), "sm")));
    const cached = thumbs.get(r.id);
    const fill = (doc) => requestAnimationFrame(() => miniature(host, thumb, doc.resume, doc.design));
    if (cached && cached.updated === r.updated) fill(cached.doc);
    else api("resumes/" + r.id).then((doc) => { thumbs.set(r.id, { updated: r.updated, doc }); fill(doc); }).catch(() => {});
    return node;
  }

  function cardMenu(anchor, r) {
    const others = S.lib.people.filter((p) => p.id !== r.owner);
    menu(anchor, [
      { label: "Duplicate", icon: "copy", fn: () => duplicate(r) },
      { label: "Rename", icon: "edit", fn: async () => {
        const title = await promptBox("Rename resume", "Name", r.title);
        if (!title) return;
        const doc = await api("resumes/" + r.id);
        await api("resumes/" + r.id, { rev: doc.rev, title });
        await refreshLibrary(); renderLibrary();
      } },
      { label: "Export JSON", icon: "file", fn: async () => exportJson(await api("resumes/" + r.id)) },
      others.length ? "-" : null,
      others.length ? { label: "Move to" } : null,
      ...others.map((p) => ({ label: p.name, icon: "user", fn: async () => {
        const doc = await api("resumes/" + r.id);
        await api("resumes/" + r.id, { rev: doc.rev, owner: p.id });
        await refreshLibrary(); renderLibrary();
        toast(`Moved to ${p.name}`);
      } })),
      "-",
      { label: "Delete", icon: "trash", danger: true, fn: async () => {
        if (!await confirmBox(`Delete “${r.title}”?`, "It moves to the trash folder on the server, so it can still be recovered there.")) return;
        S.lib = await api(`resumes/${r.id}/delete`, {});
        renderLibrary();
        toast("Resume deleted");
      } },
    ]);
  }

  function personMenu(anchor, p) {
    menu(anchor, [
      { label: "Rename " + p.name, icon: "edit", fn: async () => {
        const name = await promptBox("Rename person", "Name", p.name);
        if (!name) return;
        S.lib = await api("people/" + p.id, { name });
        renderLibrary();
      } },
      { label: "Remove " + p.name, icon: "trash", danger: true, fn: async () => {
        if (!await confirmBox(`Remove ${p.name}?`, "Only someone with no resumes left can be removed.", "Remove")) return;
        try {
          S.lib = await api(`people/${p.id}/delete`, {});
          S.person = (S.lib.people[0] || {}).id || null;
          renderLibrary();
        } catch (err) { toast(err.message); }
      } },
    ]);
  }

  async function addPerson() {
    const name = await promptBox("Add a person", "Name", "", "Add");
    if (!name) return;
    S.lib = await api("people", { name });
    S.person = S.lib.people[S.lib.people.length - 1].id;
    store.set("person", S.person);
    renderLibrary();
  }

  async function duplicate(r) {
    const doc = await api("resumes", { owner: S.person, from: r.id });
    await refreshLibrary();
    if (!S.doc) renderLibrary();
    toast(`Made “${doc.title}”`, "Open", () => { location.hash = "#/r/" + doc.id; });
  }

  async function newResume() {
    const mine = S.lib.resumes.filter((r) => r.owner === S.person);
    const all = S.lib.resumes;
    const title = el("input", { value: mine.length ? "" : "Resume", attrs: { maxlength: 80, placeholder: "e.g. SRE roles, Product roles" } });
    const pick = el("select", {}, all.map((r) => el("option", { value: r.id,
      text: (r.owner === S.person ? "" : personName(r.owner) + ": ") + r.title })));
    const radio = (value, checked) => el("input", { type: "radio", name: "from", value, checked });
    const body = [
      el("label.field", {}, el("span", { text: "Name of this copy" }), title),
      all.length ? el("label.choice", {}, radio("copy", true),
        el("div", {}, el("b", { text: "Copy an existing resume" }),
          el("small", { text: "Same content and look; change what this application needs." }), pick)) : null,
      el("label.choice", {}, radio("blank", !all.length),
        el("div", {}, el("b", { text: "Start blank" }), el("small", { text: "An empty resume in the Charcoal template." }))),
    ];
    const doc = await dialog({ title: "New resume", body, okLabel: "Create", ok: async () => {
      const from = $dlg.querySelector("input[name=from]:checked").value;
      const t = title.value.trim();
      if (from === "copy") return api("resumes", { owner: S.person, from: pick.value, title: t || undefined });
      const resume = BLANK();
      resume.basics.name = personName(S.person);
      return api("resumes", { owner: S.person, title: t || "Resume", resume });
    } });
    if (doc) location.hash = "#/r/" + doc.id;
  }

  function importFile() {
    const input = el("input", { type: "file", attrs: { accept: ".html,.htm,.json,application/json,text/html" } });
    input.addEventListener("change", async () => {
      const f = input.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        let resume, design;
        if (/\.html?$/i.test(f.name) || /^\s*</.test(text)) {
          resume = (await api("import/editor", text, "text/html")).resume;
        } else {
          const obj = JSON.parse(text);
          if (obj.resume && obj.design) { resume = obj.resume; design = obj.design; }
          else {
            resume = obj;
            design = obj.meta && obj.meta.resumeApp;
            if (design) { resume = Object.assign({}, obj); resume.meta = Object.assign({}, obj.meta); delete resume.meta.resumeApp; }
          }
          if (!resume || typeof resume !== "object" || !(resume.basics || resume.work)) throw new Error("That JSON doesn’t look like a resume");
        }
        const title = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported";
        const doc = await api("resumes", { owner: S.person, title, resume, design });
        location.hash = "#/r/" + doc.id;
        toast("Imported “" + f.name + "”");
      } catch (err) {
        toast("Couldn’t import: " + err.message);
      }
    });
    input.click();
  }

  function exportJson(doc) {
    const out = Object.assign({ $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json" }, doc.resume);
    out.meta = Object.assign({}, doc.resume.meta, { lastModified: doc.updated, resumeApp: doc.design });
    const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" })),
      download: (doc.title || "resume").replace(/[\\/:*?"<>|]+/g, " ") + ".json" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ----------------------------------------------------------------- editor
  async function openResume(id) {
    if (S.doc && S.doc.id === id) return;
    let doc;
    try {
      [doc] = await Promise.all([api("resumes/" + id), S.lib.people.length ? null : refreshLibrary()]);
    } catch (err) {
      toast(err.status === 404 ? "That resume no longer exists" : err.message);
      location.hash = "#/";
      return;
    }
    S.doc = doc;
    normalise(S.doc.resume);
    S.seq = S.savedSeq = 0;
    S.viewing = null;
    S.open = new Set(S.doc.resume.work.slice(0, 1));
    const last = store.get("section");
    S.section = SECTIONS.some((s) => s.key === last) ? last : "work";
    if (S.doc.owner !== S.person) { S.person = S.doc.owner; store.set("person", S.person); }
    swap(renderEditor);
  }

  const SECTIONS = [
    { key: "basics", title: "Profile", icon: "user",
      about: "Name, headline, contact details and the summary at the top of the page." },
    { key: "work", title: "Experience", icon: "briefcase",
      about: "Roles, newest first. Open one to edit it; drag the handle to reorder." },
    { key: "skills", title: "Skills", icon: "skills",
      about: "Skills in named groups. Type a skill and press Enter; click one to rename it; drag to reorder or move between groups." },
    { key: "education", title: "Education", icon: "cap", about: "Degrees and schools, newest first." },
    { key: "certificates", title: "Certifications", icon: "badge", about: "Name, who issued it, and when." },
    { key: "projects", title: "Projects", icon: "folder", about: "Side projects or notable work outside a role." },
    { key: "languages", title: "Languages", icon: "globe", about: "Languages spoken and how well." },
  ];
  const sectionOf = (key) => SECTIONS.find((s) => s.key === key);

  let ui = null;      // {rail, pane, inner, workspace}

  function renderEditor() {
    const doc = S.doc;
    document.body.classList.add("editing");
    document.title = doc.title + " · Resume";
    const title = el("input.title-input", { value: doc.title, attrs: { "aria-label": "Resume name", maxlength: 80,
      title: "The name of this copy (only shown here; the PDF is named after the person)" },
      on: { input: (e) => { doc.title = e.target.value; document.title = doc.title + " · Resume"; changed({ noPreview: true }); } } });
    const bar = el("header.topbar", {},
      iconBtn("back", "All resumes", () => { location.hash = "#/"; }),
      title,
      el("span.status.ok#status", { text: "Saved" }),
      el("span.spacer"),
      btn("Design", "ghost hide-narrow", () => openDesign(), "palette", "Template, colour and paper"),
      btn("History", "ghost hide-narrow", openHistory, "history", "Earlier versions"),
      iconBtn("more", "More", (e) => menu(e.currentTarget, [
        { label: "Design", icon: "palette", fn: () => openDesign() },
        { label: "History", icon: "history", fn: openHistory },
        "-",
        { label: "Open PDF in a new tab", icon: "eye", fn: async () => { await flush(); open(`api/resumes/${doc.id}/pdf?view=1`, "_blank"); } },
        { label: "Duplicate", icon: "copy", fn: async () => { await flush(); duplicate({ id: doc.id }); } },
        { label: "Export JSON", icon: "file", fn: () => exportJson(doc) },
      ])),
      btn("Download PDF", "primary", downloadPdf, "download"));

    const rail = el("nav.rail", { attrs: { "aria-label": "Sections" } },
      el("div.rail-label", { text: "Sections" }),
      SECTIONS.map((s) => el("button.rail-item", { type: "button", attrs: { "data-key": s.key, title: s.title },
        on: { click: () => showSection(s.key) } }, icon(s.icon), el("span.label", { text: s.title }), el("span.n"))),
      el("div.rail-foot", {}, el("div", {}, el("kbd", { text: "Enter" }), " next point"),
        el("div", {}, el("kbd", { text: "Ctrl" }), "+", el("kbd", { text: "S" }), " keep a version")));
    const inner = el("div.form-inner");
    const pane = el("section.form-pane", { attrs: { "aria-label": "Editor" } }, inner);
    const workspace = el("div.workspace", {}, rail, pane, previewPane());
    const toggle = el("div.view-toggle", {},
      el("button.on", { type: "button", text: "Edit", on: { click: () => setView(false) } }),
      el("button", { type: "button", text: "Preview", on: { click: () => setView(true) } }));
    ui = { rail, pane, inner, workspace, toggle };
    drawer = null;
    $app.replaceChildren(bar, workspace, toggle);
    showSection(S.section, true);
    drawPreview();
  }

  function setView(preview) {
    ui.workspace.classList.toggle("show-preview", preview);
    ui.toggle.children[0].classList.toggle("on", !preview);
    ui.toggle.children[1].classList.toggle("on", preview);
    if (preview) requestAnimationFrame(layoutPreview);
  }

  async function downloadPdf() {
    await flush();
    setStatus("Making PDF…", "busy");
    location.href = `api/resumes/${S.doc.id}/pdf`;
    setTimeout(() => setStatus("Saved", "ok"), 1800);
  }

  function updateRail() {
    if (!ui) return;
    const r = S.doc.resume;
    for (const b of ui.rail.querySelectorAll(".rail-item")) {
      const key = b.dataset.key;
      const n = key === "basics" ? 0 : r[key].length;
      const badge = b.querySelector(".n");
      badge.textContent = n || "";
      badge.hidden = !n;
      b.classList.toggle("on", key === S.section);
    }
  }

  function showSection(key, force) {
    if (key === S.section && !force && ui.inner.firstChild) return;
    S.section = key;
    store.set("section", key);
    const builders = { basics: profilePanel, skills: skillsPanel, certificates: () => rowsPanel(ROWS.certificates),
      languages: () => rowsPanel(ROWS.languages) };
    const body = (builders[key] || (() => listPanel(LISTS[key])))();
    const i = SECTIONS.findIndex((s) => s.key === key);
    const prev = SECTIONS[i - 1], next = SECTIONS[i + 1];
    const nav = el("div.panel-nav", {},
      prev ? btn(prev.title, "ghost", () => showSection(prev.key), "left") : el("span"),
      next ? el("button.btn.ghost", { type: "button", on: { click: () => showSection(next.key) } }, next.title, icon("right")) : el("span"));
    ui.inner.replaceChildren(el("div.panel", {}, body, nav));
    ui.pane.scrollTop = 0;
    autosizeAll(ui.inner);
    updateRail();
  }

  function panelHead(key, ...tools) {
    const s = sectionOf(key);
    return el("div.panel-head", {}, el("div", {}, el("h2", { text: s.title }), el("p", { text: s.about })), tools);
  }

  /* An input bound to obj[key]. */
  function field(label, obj, key, opts) {
    const o = opts || {};
    const attrs = { placeholder: o.placeholder, type: o.type, inputmode: o.inputmode, autocomplete: "off",
      maxlength: o.max, "data-k": key, list: o.list };
    const input = o.multiline
      ? el("textarea", { value: obj[key] || "", attrs: { rows: o.rows || 3, placeholder: o.placeholder, "data-k": key } })
      : el("input", { value: obj[key] || "", attrs });
    input.addEventListener("input", () => {
      obj[key] = input.value;
      if (o.multiline) autosize(input);
      if (o.onInput) o.onInput(input.value);
      changed();
    });
    return el("label.field" + (o.wide ? ".wide" : ""), {}, el("span", { text: label }), input,
      o.hint ? el("span.hint", { text: o.hint }) : null);
  }

  // ---- profile
  function profilePanel() {
    const b = S.doc.resume.basics;
    const links = el("div.links");
    function linkRow(p) {
      const row = el("div.link-row", {}, grip(),
        el("input.input", { value: p.network || "", attrs: { placeholder: "LinkedIn", "aria-label": "Site", list: "networks" },
          on: { input: (e) => { p.network = e.target.value; changed(); } } }),
        el("input.input", { value: p.url || "", attrs: { placeholder: "https://linkedin.com/in/…", "aria-label": "Link", inputmode: "url" },
          on: { input: (e) => { p.url = e.target.value; changed(); } } }),
        iconBtn("x", "Remove link", () => {
          const i = b.profiles.indexOf(p);
          b.profiles.splice(i, 1);
          vanish(row);
          changed();
          toast("Link removed", "Undo", () => {
            b.profiles.splice(i, 0, p);
            const again = linkRow(p);
            links.insertBefore(again, links.children[i] || null);
            changed();
          });
        }, "danger"));
      DATA.set(row, p);
      return row;
    }
    b.profiles.forEach((p) => links.append(linkRow(p)));
    sortable(links, { item: ".link-row", handle: ".grip", drop: () => {
      b.profiles.splice(0, b.profiles.length, ...[...links.children].map((n) => DATA.get(n)).filter(Boolean));
      changed();
    } });

    return [
      panelHead("basics"),
      el("div.box.box-pad", {}, el("div.grid", {},
        field("Full name", b, "name", { placeholder: "Your name" }),
        field("Headline", b, "label", { placeholder: "e.g. Site Reliability Engineer" }),
        field("Email", b, "email", { type: "email", inputmode: "email" }),
        field("Phone", b, "phone", { type: "tel", inputmode: "tel" }),
        field("City", b.location, "city"),
        field("Country", b.location, "countryCode", { placeholder: "e.g. IN or India" }),
        field("Website", b, "url", { inputmode: "url", placeholder: "Optional", wide: true }))),
      el("div.sub-head", {}, el("h3", { text: "Summary" })),
      el("div.box.box-pad", {}, el("div.grid", {},
        field("Profile summary", b, "summary", { multiline: true, rows: 5, wide: true,
          hint: "A few lines about you. Wrap words in **double stars** to make them bold." }))),
      el("div.sub-head", {}, el("h3", { text: "Links" }),
        btn("Add link", "small soft", () => {
          const p = { network: "", url: "" };
          b.profiles.push(p);
          const row = linkRow(p);
          row.classList.add("entering");
          links.append(row);
          changed();
          row.querySelector("input").focus();
        }, "plus")),
      links,
      el("datalist#networks", {}, ["LinkedIn", "GitHub", "GitLab", "X", "Portfolio", "Blog"].map((n) => el("option", { value: n }))),
    ];
  }

  // ---- list sections with entries that open (experience, education, projects)
  const LISTS = {
    work: {
      key: "work", add: "Add role", noun: "role", points: "highlights", present: true, empty: "No roles yet.",
      blank: () => ({ position: "", name: "", location: "", startDate: thisMonth(), endDate: "", highlights: [""] }),
      head: (w) => [w.position || w.name, [w.name && w.position ? w.name : "", span(w, true)].filter(Boolean).join(" · "),
        w.highlights.filter((x) => x.trim()).length],
      placeholder: "New role",
      fields: (w) => [
        field("Job title", w, "position", { placeholder: "e.g. Senior DevOps Engineer" }),
        field("Company", w, "name"),
        field("Location", w, "location", { placeholder: "Optional", wide: true }),
        dates(w, true),
      ],
    },
    education: {
      key: "education", add: "Add education", noun: "entry", empty: "No education yet.",
      blank: () => ({ studyType: "", area: "", institution: "", startDate: "", endDate: "", score: "" }),
      head: (e) => [[e.studyType, e.area].filter(Boolean).join(", "), [e.institution, span(e)].filter(Boolean).join(" · ")],
      placeholder: "New entry",
      fields: (e) => [
        field("Degree", e, "studyType", { placeholder: "e.g. BCA" }),
        field("Field of study", e, "area", { placeholder: "Optional" }),
        field("School or university", e, "institution", { wide: true }),
        dates(e, false),
        field("Grade", e, "score", { placeholder: "Optional" }),
      ],
    },
    projects: {
      key: "projects", add: "Add project", noun: "project", points: "highlights", empty: "No projects yet.",
      blank: () => ({ name: "", url: "", description: "", startDate: "", endDate: "", highlights: [] }),
      head: (p) => [p.name, [p.url, span(p)].filter(Boolean).join(" · "), p.highlights.filter((x) => x.trim()).length],
      placeholder: "New project",
      fields: (p) => [
        field("Project", p, "name"),
        field("Link", p, "url", { placeholder: "Optional", inputmode: "url" }),
        field("Description", p, "description", { multiline: true, rows: 2, wide: true }),
        dates(p, false),
      ],
    },
  };

  /* Start and end month; for jobs a "current role" switch stands for an empty end. */
  const lastEnd = new WeakMap();      // the end date the switch cleared
  function dates(item, present) {
    const start = el("input", { type: "month", value: item.startDate || "", attrs: { "data-k": "startDate" },
      on: { input: (e) => { item.startDate = e.target.value; changed(); } } });
    const end = el("input", { type: "month", value: item.endDate || "", hidden: present && !item.endDate, attrs: { "data-k": "endDate" },
      on: { input: (e) => { item.endDate = e.target.value; changed(); } } });
    const now = el("input", { value: "Present", disabled: true, hidden: !(present && !item.endDate) });
    const wrap = el("div.grid.wide", {},
      el("label.field", {}, el("span", { text: "Start" }), start),
      el("label.field", {}, el("span", { text: "End" }), end, now));
    if (present) {
      const box = el("input", { type: "checkbox", checked: !item.endDate });
      box.addEventListener("change", () => {
        end.hidden = box.checked;
        now.hidden = !box.checked;
        if (box.checked) { lastEnd.set(item, item.endDate); item.endDate = ""; end.value = ""; }
        else { item.endDate = lastEnd.get(item) || thisMonth(); end.value = item.endDate; end.focus(); }
        changed();
      });
      wrap.append(el("label.switch.wide", {}, box, "I work here now"));
    }
    return wrap;
  }

  function listPanel(cfg) {
    const list = S.doc.resume[cfg.key];
    const box = el("div.entries");
    const addBtn = () => btn(cfg.add, "primary small", () => addEntry(), "plus");
    const empty = el("div.list-empty", { hidden: list.length > 0 }, el("div", { text: cfg.empty }), addBtn());
    const sync = () => {
      list.splice(0, list.length, ...[...box.children].map((n) => DATA.get(n)).filter(Boolean));
      empty.hidden = list.length > 0;
      changed();
    };
    const ctx = { cfg, list, box, sync };
    list.forEach((item) => box.append(entryCard(ctx, item)));
    sortable(box, { item: ".entry", handle: ".entry-head .grip", drop: sync });

    function addEntry() {
      const item = cfg.blank();
      list.unshift(item);
      S.open.add(item);
      const node = entryCard(ctx, item, true);
      node.classList.add("entering", "flash");
      box.prepend(node);
      empty.hidden = true;
      changed();
      ui.pane.scrollTo({ top: 0, behavior: "smooth" });
      const input = node.querySelector(".entry-body input");
      if (input) input.focus({ preventScroll: true });
    }
    return [panelHead(cfg.key, addBtn()), box, empty];
  }

  function entryCard(ctx, item, isNew) {
    const { cfg, list, box, sync } = ctx;
    const titleB = el("b");
    const subS = el("small");
    const refreshHead = () => {
      const [t, s, pts] = cfg.head(item);
      titleB.textContent = t || cfg.placeholder;
      titleB.classList.toggle("placeholder", !t);
      subS.textContent = [s, pts ? plural(pts, "point") : ""].filter(Boolean).join(" · ") || " ";
    };
    refreshHead();
    const main = el("button.entry-main", { type: "button", attrs: { "aria-expanded": "false" } },
      el("div.entry-title", {}, titleB, subS), icon("chev", "chev"));
    const inner = el("div");
    const node = el("div.entry", {},
      el("div.entry-head", {}, grip(), main,
        el("div.tools", {},
          iconBtn("more", "More", (e) => menu(e.currentTarget, [
            { label: "Duplicate", icon: "copy", fn: () => {
              const copy = JSON.parse(JSON.stringify(item));
              const i = list.indexOf(item);
              list.splice(i + 1, 0, copy);
              S.open.add(copy);
              const n = entryCard(ctx, copy);
              n.classList.add("entering", "flash");
              node.after(n);
              changed();
            } },
            { label: "Move up", icon: "up", disabled: !node.previousElementSibling, fn: () => moveBy(-1) },
            { label: "Move down", icon: "down", disabled: !node.nextElementSibling, fn: () => moveBy(1) },
            "-",
            { label: "Delete " + cfg.noun, icon: "trash", danger: true, fn: remove },
          ]), "sm"),
          iconBtn("trash", "Delete " + cfg.noun, remove, "danger sm"))),
      el("div.fold", {}, inner));
    DATA.set(node, item);
    NODE.set(item, node);

    function moveBy(d) {
      const sib = d < 0 ? node.previousElementSibling : node.nextElementSibling;
      if (!sib) return;
      flip([node, sib], () => (d < 0 ? sib.before(node) : sib.after(node)));
      sync();
    }
    function remove() {
      const i = list.indexOf(item);
      const [t] = cfg.head(item);
      vanish(node, () => sync());
      DATA.delete(node);
      list.splice(i, 1);
      changed();
      toast(t ? `Deleted “${t}”` : `Deleted the ${cfg.noun}`, "Undo", () => {
        list.splice(i, 0, item);
        const again = entryCard(ctx, item);
        again.classList.add("entering");
        box.insertBefore(again, box.children[i] || null);
        sync();
      });
    }

    let built = false;
    function build() {
      built = true;
      const body = el("div.entry-body", { on: { input: refreshHead, change: refreshHead } });
      // a new current job while an older one is still marked current
      if (cfg.present && isNew) {
        const stale = list.find((x) => x !== item && !x.endDate);
        if (stale) {
          const when = el("input", { type: "month", value: thisMonth() });
          const note = el("div.notice", {}, `“${stale.position || stale.name}” is still marked as your current role. It ended in`, when,
            btn("Set end date", "small", () => {
              stale.endDate = when.value || thisMonth();
              note.remove();
              changed();
              const n = NODE.get(stale);
              if (n && n._refresh) n._refresh();
              toast(`Set the end date of “${stale.position || stale.name}”`);
            }),
            btn("Keep both current", "small ghost", () => note.remove()));
          body.append(note);
        }
      }
      body.append(el("div.grid", {}, cfg.fields(item)));
      if (cfg.points) body.append(pointsEditor(item, cfg.points, refreshHead));
      inner.append(body);
      autosizeAll(body);
    }
    function setOpen(on, instant) {
      if (on && !built) build();
      if (instant) {
        node.classList.add("no-anim");
        requestAnimationFrame(() => requestAnimationFrame(() => node.classList.remove("no-anim")));
      }
      node.classList.toggle("open", on);
      main.setAttribute("aria-expanded", String(on));
      inner.inert = !on;
      if (on) S.open.add(item); else S.open.delete(item);
    }
    main.addEventListener("click", () => setOpen(!node.classList.contains("open")));
    node.addEventListener("keydown", (e) => {
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && e.target === main) {
        e.preventDefault();
        moveBy(e.key === "ArrowUp" ? -1 : 1);
        main.focus();
      }
    });
    node._open = setOpen;
    node._refresh = () => {
      refreshHead();
      if (built) { inner.replaceChildren(); built = false; if (node.classList.contains("open")) build(); }
    };
    setOpen(S.open.has(item), true);
    return node;
  }

  /* The bullet points of an entry. Enter starts the next point, Backspace at
   * the start of a point joins it to the one above, pasting several lines
   * makes several points, Alt+Up/Down or the handle moves a point. */
  function pointsEditor(item, key, onChange) {
    const list = item[key];
    const box = el("div.points");
    const sync = () => {
      list.splice(0, list.length, ...[...box.querySelectorAll(".point:not(.leaving) textarea")].map((t) => t.value.replace(/\n/g, " ")));
      onChange();
      changed();
    };
    const focusAt = (node, at) => {
      const ta = node.querySelector("textarea");
      ta.focus();
      const p = at == null ? ta.value.length : at;
      ta.setSelectionRange(p, p);
    };
    function add(after, text) {
      const n = row(text);
      if (after) after.after(n); else box.append(n);
      autosize(n.querySelector("textarea"));
      return n;
    }
    function remove(node) {
      const ta = node.querySelector("textarea");
      const i = [...box.children].indexOf(node);
      const text = ta.value;
      const near = node.nextElementSibling || node.previousElementSibling;
      if (document.activeElement === ta && near) focusAt(near);
      vanish(node, sync);
      if (text.trim()) toast("Point deleted", "Undo", () => {
        const n = row(text);
        box.insertBefore(n, box.children[i] || null);
        autosize(n.querySelector("textarea"));
        sync();
      });
    }
    function row(text) {
      const ta = el("textarea", { value: text, rows: 1, attrs: { placeholder: "What you did, and what came of it", "aria-label": "Point" } });
      const node = el("div.point", {}, grip("Drag to reorder (or Alt+↑/↓)"), ta,
        iconBtn("x", "Delete point", () => remove(node), "danger sm"));
      ta.addEventListener("input", () => { autosize(ta); sync(); });
      ta.addEventListener("keydown", (e) => {
        const s = ta.selectionStart, end = ta.selectionEnd;
        const prev = node.previousElementSibling, next = node.nextElementSibling;
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          const rest = ta.value.slice(end).trimStart();
          ta.value = ta.value.slice(0, s).trimEnd();
          autosize(ta);
          focusAt(add(node, rest), 0);
          sync();
        } else if (e.key === "Backspace" && s === 0 && end === 0 && prev) {
          e.preventDefault();
          const pta = prev.querySelector("textarea");
          const joined = pta.value && ta.value ? pta.value + " " : pta.value;
          pta.value = joined + ta.value;
          node.remove();
          autosize(pta);
          focusAt(prev, joined.length);
          sync();
        } else if (e.key === "Backspace" && !ta.value && !prev && next) {
          e.preventDefault();
          node.remove();
          focusAt(next, 0);
          sync();
        } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
          const sib = e.key === "ArrowUp" ? prev : next;
          if (!sib) return;
          flip([node, sib], () => (e.key === "ArrowUp" ? sib.before(node) : sib.after(node)));
          focusAt(node, s);
          sync();
        }
      });
      ta.addEventListener("paste", (e) => {
        const text = (e.clipboardData || window.clipboardData).getData("text");
        if (!/\n/.test(text.trim())) return;
        e.preventDefault();
        const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•▪▸–·>]|\d+[.)])\s+/, "").trim()).filter(Boolean);
        const after = ta.value.slice(ta.selectionEnd);
        ta.value = ta.value.slice(0, ta.selectionStart) + lines[0];
        autosize(ta);
        let lastNode = node;
        for (const l of lines.slice(1)) lastNode = add(lastNode, l);
        const lta = lastNode.querySelector("textarea");
        const caret = lta.value.length;
        lta.value += after;
        autosize(lta);
        focusAt(lastNode, caret);
        sync();
        toast(`Added ${plural(lines.length, "point")} from the pasted lines`);
      });
      return node;
    }
    list.forEach((t) => box.append(row(t)));
    sortable(box, { item: ".point", handle: ".grip", drop: sync });
    return el("div", {},
      el("div.points-head", {}, el("b", { text: "Points" }),
        el("span.hint", {}, el("kbd", { text: "Enter" }), " new point · paste a list to add many")),
      box,
      btn("Add point", "small ghost add-row", () => {
        const last = box.lastElementChild;
        if (last && !last.querySelector("textarea").value.trim()) return focusAt(last);
        focusAt(add(null, ""));
        sync();
      }, "plus"));
  }

  // ---- one-line sections (certifications, languages)
  const ROWS = {
    certificates: {
      key: "certificates", add: "Add certification", empty: "No certifications yet.",
      blank: () => ({ name: "", issuer: "", date: "" }),
      cols: [
        { k: "name", label: "Certification", flex: "1 1 100%", placeholder: "e.g. AWS Solutions Architect – Associate" },
        { k: "issuer", label: "Issued by", flex: "1 1 0", placeholder: "Issued by (optional)" },
        { k: "date", label: "Date", type: "month", flex: "0 0 160px" },
      ],
    },
    languages: {
      key: "languages", add: "Add language", empty: "No languages yet.", atEnd: true,
      blank: () => ({ language: "", fluency: "" }),
      cols: [
        { k: "language", label: "Language", flex: "1 1 0", placeholder: "e.g. English" },
        { k: "fluency", label: "Fluency", flex: "1 1 0", placeholder: "e.g. Native, Fluent", list: "fluency" },
      ],
    },
  };

  function rowsPanel(cfg) {
    const list = S.doc.resume[cfg.key];
    const box = el("div.rows");
    const empty = el("div.list-empty", { hidden: list.length > 0 }, el("div", { text: cfg.empty }),
      btn(cfg.add, "primary small", () => addRow(), "plus"));
    const sync = () => {
      list.splice(0, list.length, ...[...box.children].map((n) => DATA.get(n)).filter(Boolean));
      empty.hidden = list.length > 0;
      changed();
    };
    function row(item) {
      const node = el("div.row", {}, grip(),
        el("div.row-fields", {}, cfg.cols.map((c) => {
          const input = el("input.input", { value: item[c.k] || "", type: c.type || "text",
            attrs: { placeholder: c.placeholder, "aria-label": c.label, "data-k": c.k, list: c.list },
            on: { input: (e) => { item[c.k] = e.target.value; changed(); } } });
          input.style.flex = c.flex;
          return input;
        })),
        iconBtn("x", "Delete", () => {
          const i = list.indexOf(item);
          vanish(node, sync);
          DATA.delete(node);
          list.splice(i, 1);
          changed();
          if (Object.values(item).some((v) => String(v).trim())) toast("Deleted", "Undo", () => {
            list.splice(i, 0, item);
            const n = row(item);
            box.insertBefore(n, box.children[i] || null);
            sync();
          });
        }, "danger sm"));
      DATA.set(node, item);
      NODE.set(item, node);
      return node;
    }
    function addRow() {
      const item = cfg.blank();
      const n = row(item);
      n.classList.add("entering");
      if (cfg.atEnd) { list.push(item); box.append(n); } else { list.unshift(item); box.prepend(n); }
      empty.hidden = true;
      changed();
      n.querySelector("input").focus();
    }
    list.forEach((item) => box.append(row(item)));
    sortable(box, { item: ".row", handle: ".grip", drop: sync });
    return [panelHead(cfg.key, btn(cfg.add, "primary small", addRow, "plus")), box, empty,
      el("datalist#fluency", {}, ["Native", "Fluent", "Professional", "Conversational", "Basic"].map((n) => el("option", { value: n })))];
  }

  // ---- skills
  function skillsPanel() {
    const groups = S.doc.resume.skills;
    const box = el("div.groups");
    const syncGroups = () => {
      groups.splice(0, groups.length, ...[...box.children].map((n) => DATA.get(n)).filter(Boolean));
      changed();
    };
    groups.forEach((g) => box.append(groupCard(g, box, syncGroups)));
    sortable(box, { item: ".group", handle: ".group-head > .grip", drop: syncGroups });
    const none = el("div.list-empty", { hidden: groups.length > 0 },
      el("div", { text: "No skills yet. Start with a group, e.g. “Cloud Platforms”." }));
    const addGroup = () => {
      none.hidden = true;
      const g = { name: "", keywords: [] };
      groups.push(g);
      const n = groupCard(g, box, syncGroups);
      n.classList.add("entering");
      box.append(n);
      changed();
      const name = n.querySelector(".group-name");
      name.focus({ preventScroll: true });
      n.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    return [panelHead("skills", btn("Add group", "small", addGroup, "plus")),
      none, box,
      el("button.add-group", { type: "button", on: { click: addGroup } }, icon("plus"), "Add skill group")];
  }

  function groupCard(g, box, syncGroups) {
    const name = el("input.group-name", { value: g.name || "", attrs: { placeholder: "Group name, e.g. Cloud Platforms",
      "aria-label": "Group name", "data-k": "name" } });
    const count = el("span.count");
    const chips = el("div.chips");
    const addInput = el("input", { attrs: { placeholder: "Add a skill", "aria-label": "Add a skill" } });
    const adder = el("label.chip-add", {}, icon("plus"), addInput);
    DATA.set(chips, g);
    const showCount = () => { count.textContent = plural(g.keywords.length, "skill"); };
    name.addEventListener("input", () => { g.name = name.value; changed(); });
    name.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addInput.focus(); } });

    function commit() {
      const parts = addInput.value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
      addInput.value = "";
      for (const p of parts) {
        const dup = [...chips.querySelectorAll(".chip")].find((c) => c.dataset.v.toLowerCase() === p.toLowerCase());
        if (dup) { pulse(dup); continue; }
        const c = chip(p);
        c.classList.add("entering");
        adder.before(c);
      }
      if (parts.length) syncChips(chips);
    }
    addInput.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === ",") && !e.isComposing) { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { addInput.value = ""; addInput.blur(); }
    });
    addInput.addEventListener("blur", commit);
    addInput.addEventListener("paste", (e) => {
      const text = e.clipboardData.getData("text");
      if (!/[,;\n]/.test(text)) return;
      e.preventDefault();
      addInput.value += text;
      commit();
    });

    g.keywords.forEach((k) => chips.append(chip(k)));
    chips.append(adder);
    sortable(chips, { item: ".chip", group: "skills", wrap: true, drop: (item, from, to) => {
      syncChips(from);
      if (to !== from) syncChips(to);
    } });
    chips._count = showCount;
    showCount();

    const node = el("div.group", {},
      el("div.group-head", {}, grip("Drag to reorder groups"), name, count,
        el("div.tools", {},
          iconBtn("more", "More", (e) => menu(e.currentTarget, [
            { label: "Move up", icon: "up", disabled: !node.previousElementSibling, fn: () => moveBy(-1) },
            { label: "Move down", icon: "down", disabled: !node.nextElementSibling, fn: () => moveBy(1) },
            { label: "Sort skills A–Z", icon: "down", fn: () => {
              const all = [...chips.querySelectorAll(".chip")];
              flip(all, () => all.sort((a, b) => a.dataset.v.localeCompare(b.dataset.v)).forEach((c) => adder.before(c)));
              syncChips(chips);
            } },
            "-",
            { label: "Delete group", icon: "trash", danger: true, fn: remove },
          ]), "sm"),
          iconBtn("trash", "Delete group", remove, "danger sm"))),
      chips);
    DATA.set(node, g);
    NODE.set(g, node);

    function moveBy(d) {
      const sib = d < 0 ? node.previousElementSibling : node.nextElementSibling;
      if (!sib) return;
      flip([node, sib], () => (d < 0 ? sib.before(node) : sib.after(node)));
      syncGroups();
    }
    function remove() {
      const i = [...box.children].indexOf(node);
      vanish(node, syncGroups);
      DATA.delete(node);
      toast(`Deleted “${g.name || "group"}”`, "Undo", () => {
        const n = groupCard(g, box, syncGroups);
        n.classList.add("entering");
        box.insertBefore(n, box.children[i] || null);
        syncGroups();
      });
    }
    return node;
  }

  function syncChips(chips) {
    const g = DATA.get(chips);
    if (!g) return;
    g.keywords.splice(0, g.keywords.length, ...[...chips.querySelectorAll(".chip:not(.leaving)")].map((c) => c.dataset.v));
    if (chips._count) chips._count();
    changed();
  }

  function chip(text) {
    const txt = el("span.txt", { text, attrs: { title: "Click to rename, drag to move" } });
    const node = el("span.chip", {}, txt,
      el("button", { type: "button", attrs: { "aria-label": "Remove " + text, title: "Remove" }, on: { click: () => {
        const box = node.parentElement;
        const next = node.nextElementSibling;
        vanish(node, () => syncChips(box));
        toast(`Removed “${node.dataset.v}”`, "Undo", () => {
          const c = chip(node.dataset.v);
          box.insertBefore(c, next && next.isConnected ? next : box.querySelector(".chip-add"));
          syncChips(box);
        });
      } } }, icon("x")));
    node.dataset.v = text;
    txt.addEventListener("click", () => {
      if (node.classList.contains("editing")) return;
      const input = el("input", { value: node.dataset.v, attrs: { "aria-label": "Rename skill" } });
      input.size = Math.max(4, input.value.length + 1);
      node.classList.add("editing");
      txt.replaceWith(input);
      input.focus();
      input.select();
      let done = false;
      const finish = (keep) => {
        if (done) return;
        done = true;
        const v = input.value.trim();
        node.classList.remove("editing");
        if (keep && v && v !== node.dataset.v) { node.dataset.v = v; txt.textContent = v; }
        input.replaceWith(txt);
        if (keep && !v) { const box = node.parentElement; vanish(node, () => syncChips(box)); return; }
        syncChips(node.parentElement);
      };
      input.addEventListener("input", () => { input.size = Math.max(4, input.value.length + 1); });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        else if (e.key === "Escape") { e.preventDefault(); finish(false); }
      });
      input.addEventListener("blur", () => finish(true));
    });
    return node;
  }

  // ---------------------------------------------------------------- preview
  let pv = null;

  function previewPane() {
    const host = el("div.host");
    const sheet = el("div.sheet", {}, host);
    const stage = el("div.stage", {}, sheet);
    const draw = Resume.mount(host);
    const pages = el("span.pages");
    const tplName = el("span");
    const zoom = el("div.seg", { attrs: { role: "group", "aria-label": "Zoom" } },
      [["fit", "Fit"], ["100", "100%"]].map(([v, t]) => el("button", { type: "button", text: t, attrs: { "data-v": v },
        on: { click: () => { pv.zoom = v; store.set("zoom", v); layoutPreview(); } } })));
    const banner = el("div.pv-banner", { hidden: true });
    const hint = el("div.pv-hint", { text: "Click anything on the page to edit it" });
    if (store.get("hinted")) hint.hidden = true;
    else setTimeout(() => { hint.classList.add("off"); store.set("hinted", "1"); }, 5000);
    pv = { host, sheet, stage, draw, pages, tplName, banner, marks: [], zoomBox: zoom,
      zoom: store.get("zoom") === "100" ? "100" : "fit" };
    host.shadowRoot.addEventListener("click", previewClick);
    new ResizeObserver(() => layoutPreview()).observe(stage);
    new ResizeObserver(() => layoutPreview()).observe(draw.doc);
    return el("section.preview-pane", { attrs: { "aria-label": "Preview" } },
      el("div.pv-bar", {},
        el("button.btn.small.ghost", { type: "button", attrs: { title: "Template, colour and paper" }, on: { click: () => openDesign() } },
          icon("palette"), tplName, icon("chev")),
        el("span.spacer"), pages, zoom),
      banner, stage, hint);
  }

  let pvRaf = 0;
  function drawPreview() {
    if (!pv || pvRaf) return;
    pvRaf = requestAnimationFrame(() => {
      pvRaf = 0;
      if (!pv || !S.doc) return;
      const src = S.viewing || S.doc;
      try {
        pv.draw(src.resume, src.design);
      } catch (err) {
        pv.draw.doc.textContent = String(err.message || err);
      }
      layoutPreview();
      refreshDesign();
    });
  }

  function layoutPreview() {
    if (!pv || !pv.stage.isConnected || !S.doc) return;
    const src = S.viewing || S.doc;
    const def = tplDef(src.design.template);
    const L = Resume.layout(def, src.design.paper);
    const width = def.width, height = pv.draw.doc.offsetHeight;
    const cs = getComputedStyle(pv.stage);
    const room = pv.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (room <= 0 || !height) return;
    const scale = pv.zoom === "fit" ? Math.min(1.25, room / width) : 1;
    pv.host.style.width = width + "px";
    pv.host.style.transform = `scale(${scale})`;
    pv.sheet.style.width = width * scale + "px";
    pv.sheet.style.height = height * scale + "px";
    const at = [];
    for (let y = L.first; y < height - 4; y += L.next) at.push(y);
    while (pv.marks.length > at.length) pv.marks.pop().remove();
    while (pv.marks.length < at.length) {
      const m = el("div.page-mark", {}, el("span", { text: "Page " + (pv.marks.length + 2) }));
      pv.sheet.append(m);
      pv.marks.push(m);
    }
    at.forEach((y, i) => { pv.marks[i].style.top = y * scale + "px"; });
    pv.pages.textContent = `${plural(at.length + 1, "page")} · ${src.design.paper === "letter" ? "US Letter" : "A4"}`;
    pv.tplName.textContent = def.name;
    for (const b of pv.zoomBox.children) b.classList.toggle("on", b.dataset.v === pv.zoom);
  }

  /* Clicking the page opens what was clicked in the editor. */
  function previewClick(e) {
    e.preventDefault();
    if (S.viewing) return;
    const r = S.doc.resume;
    const targets = [];
    const put = (text, go) => { const t = clean(text); if (t.length > 1) targets.push({ t, go }); };
    const b = r.basics;
    for (const k of ["name", "label", "email", "phone", "summary", "url"]) put(b[k], { section: "basics", field: k });
    put(b.location.city, { section: "basics", field: "city" });
    b.profiles.forEach((p) => put(String(p.url || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), { section: "basics" }));
    for (const key of ["work", "education", "projects"]) {
      r[key].forEach((item) => {
        for (const f of ["position", "name", "institution", "studyType", "area", "description", "location", "url"]) put(item[f], { section: key, item, field: f });
        (item.highlights || []).forEach((h, i) => put(h, { section: key, item, field: "highlights", index: i }));
      });
    }
    r.certificates.forEach((c) => put(c.name, { section: "certificates", item: c, field: "name" }));
    r.languages.forEach((l) => put(l.language, { section: "languages", item: l, field: "language" }));
    r.skills.forEach((g) => {
      put(g.name, { section: "skills", item: g, field: "name" });
      g.keywords.forEach((k, i) => put(k, { section: "skills", item: g, field: "keywords", index: i }));
    });

    let n = e.target.nodeType === 1 ? e.target : e.target.parentElement;
    for (let depth = 0; n && depth < 4 && !n.classList.contains("doc"); depth++, n = n.parentElement) {
      const text = clean(n.textContent);
      if (!text || text.length > 600) break;
      const exact = targets.find((x) => x.t === text);
      const inside = exact || targets.filter((x) => text.includes(x.t)).sort((a, z) => z.t.length - a.t.length)[0];
      if (inside) return jumpTo(inside.go);
      const sec = SECTIONS.find((s) => clean(s.title) === text || (s.key === "basics" && /^(summary|contact|about)/.test(text)));
      if (sec) return jumpTo({ section: sec.key });
    }
  }

  function jumpTo(t) {
    if (innerWidth <= 900) setView(false);
    showSection(t.section);
    let target = null;
    if (t.item) {
      const node = NODE.get(t.item);
      if (!node) return;
      if (node._open && !node.classList.contains("open")) node._open(true, true);
      if (t.field === "highlights") target = node.querySelectorAll(".point textarea")[t.index];
      else if (t.field === "keywords") target = node.querySelectorAll(".chip")[t.index];
      else target = node.querySelector(`[data-k="${t.field}"]`) || node;
    } else if (t.field) {
      target = ui.inner.querySelector(`[data-k="${t.field === "city" ? "city" : t.field}"]`);
    }
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center", behavior: calm.matches ? "auto" : "smooth" });
      if (target.matches("input, textarea")) target.focus({ preventScroll: true });
      pulse(target.closest(".point, .chip, .field, .row, .group, .entry") || target);
    });
  }

  function setDesign(patch) {
    Object.assign(S.doc.design, patch);
    changed();
  }

  // ------------------------------------------------------------ design drawer
  const SWATCHES = ["#2563eb", "#1e3a5f", "#0e7490", "#0f766e", "#047857", "#6d28d9", "#be123c", "#7f1d1d", "#b45309", "#334155", "#111827"];
  let drawer = null;

  function closeDesign() {
    if (!drawer) return;
    const d = drawer.node;
    drawer = null;
    d.classList.add("closing");
    d.addEventListener("animationend", () => d.remove(), { once: true });
  }

  function openDesign() {
    if (drawer) return closeDesign();
    if (innerWidth <= 900) setView(true);
    const design = S.doc.design;
    const custom = el("input", { type: "color", attrs: { title: "Any colour", "aria-label": "Any colour" },
      on: { input: (e) => setDesign({ accent: e.target.value }) } });
    const swatches = el("div.swatches");
    const paper = el("div.seg");
    const grid = el("div.tpl-grid");
    const minis = [];
    for (const t of tplList()) {
      const host = el("div.host");
      const mini = el("div.mini", {}, host);
      minis.push({ id: t.id, host, mini });
      grid.append(el("button.tpl", { type: "button", attrs: { "data-id": t.id }, on: { click: () => setDesign({ template: t.id }) } },
        mini, el("span.tpl-name", { text: t.name }), el("span.tpl-desc", { text: t.description || "" })));
    }
    const node = el("aside.drawer", { attrs: { "aria-label": "Design" } },
      el("div.drawer-head", {}, el("h2", { text: "Design" }), iconBtn("x", "Close", closeDesign)),
      el("div.drawer-body", {},
        el("section", {}, el("h3", { text: "Accent colour" }), swatches),
        el("section", {}, el("h3", { text: "Paper" }), paper),
        el("section", {}, el("h3", { text: "Template" }), grid)));
    drawer = {
      node,
      refresh() {
        const def = tplDef(design.template);
        swatches.replaceChildren(
          el("button.btn.small" + (!design.accent ? ".primary" : ""), { type: "button", text: "Template’s own",
            on: { click: () => setDesign({ accent: "" }) } }),
          ...SWATCHES.map((c) => {
            const s = el("button.swatch" + ((design.accent || "").toLowerCase() === c ? ".on" : ""), { type: "button",
              attrs: { title: c, "aria-label": "Accent " + c }, on: { click: () => setDesign({ accent: c }) } });
            s.style.background = c;
            return s;
          }),
          custom);
        custom.value = design.accent || def.accent || "#2563eb";
        paper.replaceChildren(...[["a4", "A4"], ["letter", "US Letter"]].map(([v, t]) =>
          el("button" + (design.paper === v ? ".on" : ""), { type: "button", text: t, on: { click: () => setDesign({ paper: v }) } })));
        grid.querySelectorAll(".tpl").forEach((t) => t.classList.toggle("on", t.dataset.id === design.template));
        for (const m of minis) miniature(m.host, m.mini, S.doc.resume, { template: m.id, accent: design.accent, paper: design.paper });
      },
    };
    pv.stage.parentElement.append(node);
    requestAnimationFrame(() => drawer && drawer.refresh());
  }

  let designTimer = 0;
  function refreshDesign() {
    if (!drawer) return;
    clearTimeout(designTimer);
    designTimer = setTimeout(() => drawer && drawer.refresh(), 250);
  }

  // ---------------------------------------------------------------- history
  async function openHistory() {
    await flush();
    const versions = await api(`resumes/${S.doc.id}/history`);
    const list = el("div.versions", {}, versions.length ? versions.map((v) => el("div.version", {},
      el("div", {}, el("b", { text: ago(v.saved) }),
        el("small", { text: `${new Date(v.saved).toLocaleString()} · ${tplDef(v.template).name} · ${plural(v.jobs, "job")} · ${plural(v.points, "point")}` })),
      btn("Preview", "small ghost", async () => { $dlg.close(); showVersion(await api(`resumes/${S.doc.id}/history/${v.version}`)); }, "eye"),
      btn("Restore", "small", async () => { $dlg.close(); restore(await api(`resumes/${S.doc.id}/history/${v.version}`)); })))
      : el("p.hint", { text: "No earlier versions yet. One is kept for every editing session (and whenever you press Ctrl+S)." }));
    dialog({ title: "History", text: "Earlier versions of this resume. Restoring keeps the current one here too.",
      body: list, cancelLabel: "Close", okLabel: "Save a version now", okClass: "",
      ok: async () => { await save(true); toast("Version saved"); return true; } });
  }

  function showVersion(v) {
    S.viewing = v;
    pv.banner.hidden = false;
    pv.banner.replaceChildren(el("span", { text: `Showing the version from ${new Date(v.updated).toLocaleString()}.` }),
      btn("Restore it", "small primary", () => restore(v)),
      btn("Back to current", "small ghost", () => { S.viewing = null; pv.banner.hidden = true; drawPreview(); }));
    drawPreview();
    if (innerWidth <= 900) setView(true);
  }

  async function restore(v) {
    S.viewing = null;
    S.doc.resume = normalise(v.resume);
    S.doc.design = v.design;
    S.doc.title = v.title;
    S.open = new Set(S.doc.resume.work.slice(0, 1));
    renderEditor();
    changed();
    await save(true);
    toast("Restored. The version before it is in History.");
  }

  // ------------------------------------------------------------------- start
  Promise.all([loadTemplates(), document.fonts.ready]).then(route).catch((err) => {
    $app.replaceChildren(el("div.lib", {}, el("div.empty", { text: "Couldn’t reach the server: " + err.message })));
  });
})();
