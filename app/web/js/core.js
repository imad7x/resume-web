/* Shared state, DOM helpers, the server API, menus, dialogs and toasts. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};

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
    ui: null,               // the editor's parts: {rail, pane, inner, workspace, toggle}
    pv: null,               // the preview pane's parts
    drawer: null,           // the design drawer while it is open
  };
  const $app = document.getElementById("app");
  const $dlg = document.getElementById("dlg");
  const prefs = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.2, .7, .2, 1)";
  const DATA = new WeakMap();     // editor node -> the object it edits (entry, skill group)
  const NODE = new WeakMap();     // and back

  // ---------------------------------------------------------------- helpers
  const APP = "7xResume";           // the product's name (owner's pick, 2026-11-12), in this one place
  const ICON = {
    eyeoff: '<path d="M3 3l18 18M10.6 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.3 6.3A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    award: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z"/><path d="M4 20a2 2 0 0 0 2 2h13v-4M9 7h6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.700a3.5 3.5 0 0 1 0 6.600M18 14.300a6.5 6.5 0 0 1 3.5 5.700"/>',
    star: '<path d="m12 3 2.7 5.6 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.5l6.100-.9L12 3Z"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16a3 3 0 0 1 6 0M15 10h3M15 14h3"/>',
    pen: '<path d="M4 20c3-1 4-4 6-4s2 3 4 3 3-3 6-3"/><path d="M14 4l3 3-7 7-3 .5.5-3L14 4Z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-4 4 3 3-2 4 3"/>',
    type: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 4v16"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    text: '<path d="M4 6h16M4 11h16M4 16h10"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
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
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    file: '<path d="M14 3H6v18h12V7l-4-4Z"/><path d="M14 3v4h4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    logo: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12h6M10 16h6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    skills: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 21l5-3 5 3-1.5-7"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    external: '<path d="M7 17 17 7M9 7h8v8"/>',
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
  /* The way to 7xjobs.com, the owner's job site: one quiet link at the end of every top bar. */
  const jobsLink = () => el("a.jobs-link", { href: RS.PUBLIC ? "/" : "https://7xjobs.com/", target: RS.PUBLIC ? null : "_blank", rel: "noopener",
    attrs: { title: "7xjobs: jobs in India, straight from the company (opens in a new tab)", "aria-label": "Find jobs on 7xjobs (opens in a new tab)" } },
    el("span.jl-i", {}, icon("briefcase")),
    el("span.jl-long", {}, "Find jobs on ", el("b", { text: "7xjobs" })),
    el("span.jl-short", {}, el("b", { text: "7xjobs" })),
    icon("external", "jl-go"));
  /* v21 (2026-11-13): the light/dark switch as a round button in the home top bar, as on 7xjobs. It shows the look
   * you would switch to (a sun in dark, a moon in light; CSS picks the icon). */
  const themeBtn = () => (window.RSTheme ? el("button.icon-btn.theme-btn", { type: "button",
    attrs: { title: "Light or dark look", "aria-label": "Light look", role: "switch", "aria-checked": String(RSTheme.light()) },
    on: { click: (e) => { RSTheme.set(!RSTheme.light()); e.currentTarget.setAttribute("aria-checked", String(RSTheme.light())); } } },
    el("span.theme-sun", {}, icon("sun")), el("span.theme-moon", {}, icon("moon"))) : null);
  /* The light/dark switch for menus (js/theme.js; the same choice as 7xjobs). */
  const themeItem = () => (window.RSTheme ? { label: RSTheme.light() ? "Dark look" : "Light look", icon: RSTheme.light() ? "moon" : "sun",
    fn: () => RSTheme.set(!RSTheme.light()) } : null);
  /* A resume's PDF: from the home server, or (public builder) printed from what is on this device. */
  async function pdfOf(id, view) {
    if (!RS.PUBLIC) {
      if (view) open(`api/resumes/${id}/pdf?view=1`, "_blank"); else location.href = `api/resumes/${id}/pdf`;
      return;
    }
    const win = view ? open("about:blank", "_blank") : null;      // opened now, while it is still a click
    try {
      const doc = S.doc && S.doc.id === id ? S.doc : await api("resumes/" + id);
      toast("Making your PDF…");
      await RS.devicePdf(doc, win);
    } catch (err) {
      if (win) win.close();
      toast("Couldn’t make the PDF: " + err.message);
    }
  }
  const grip = (title) => el("span.grip", { attrs: { title: title || "Drag to reorder" } }, icon("grip"));

  async function api(path, body, type) {
    if (RS.device && path !== "templates") return RS.device(path, body, type);     // public builder: js/store.js
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
  function dialog({ title, text, body, okLabel, okClass, ok, cancelLabel, wide }) {
    return new Promise((resolve) => {
      const done = (v) => { $dlg.close(); resolve(v); };
      $dlg.className = wide ? "wide" : "";
      $dlg._done = done;
      const okBtn = okLabel ? btn(okLabel, okClass || "primary", async () => {
        try {
          const v = ok ? await ok() : true;
          if (v !== undefined) done(v);
        } catch (err) { toast(err.message); }
      }) : null;
      $dlg.replaceChildren(el("form", { method: "dialog", on: { submit: (e) => { e.preventDefault(); if (okBtn) okBtn.click(); } } },
        title ? el("div.dlg-head", {}, el("h2", { text: title }), text ? el("p", { text }) : null) : null,
        body ? el("div.dlg-body", {}, body) : null,
        el("div.dlg-foot", {}, cancelLabel === false ? null : btn(cancelLabel || "Cancel", "ghost", () => done(null)), okBtn)));
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
      const width = Resume.width(def, design);
      host.style.width = width + "px";
      host.style.transform = `scale(${box.clientWidth / width})`;
    };
    fit();
    if (!host._ro) { host._ro = new ResizeObserver(fit); host._ro.observe(box); }
    host.classList.add("drawn");
  }

  // ------------------------------------------------------------------ data
  const LISTS_OF = ["work", "education", "certificates", "skills", "projects", "languages",
    "volunteer", "awards", "publications", "interests", "references", "custom"];
  const BLANK = () => ({
    basics: { name: "", label: "", email: "", phone: "", url: "", summary: "", image: "", location: { city: "", countryCode: "" },
      profiles: [], personal: [] },
    work: [], education: [], certificates: [], skills: [], projects: [], languages: [],
    volunteer: [], awards: [], publications: [], interests: [], references: [], custom: [],
    declaration: { text: "", place: "", date: "" },
  });

  /* Make sure everything the form binds to exists; keep anything else as it is. */
  function normalise(r) {
    const base = BLANK();
    r = r && typeof r === "object" ? r : {};
    r.basics = Object.assign(base.basics, r.basics || {});
    r.basics.location = Object.assign({ city: "", countryCode: "" }, r.basics.location || {});
    if (!Array.isArray(r.basics.profiles)) r.basics.profiles = [];
    if (!Array.isArray(r.basics.personal)) r.basics.personal = [];
    r.declaration = Object.assign(base.declaration, r.declaration && typeof r.declaration === "object" ? r.declaration : {});
    for (const k of LISTS_OF) {
      if (!Array.isArray(r[k])) r[k] = [];
      r[k] = r[k].filter((x) => x && typeof x === "object");
    }
    for (const w of r.work.concat(r.projects, r.volunteer)) if (!Array.isArray(w.highlights)) w.highlights = [];
    for (const c of r.custom) {
      if (!Array.isArray(c.items)) c.items = [];
      if (!Array.isArray(c.lines)) c.lines = [];
      for (const it of c.items) if (!Array.isArray(it.points)) it.points = [];
    }
    for (const g of r.skills) if (!Array.isArray(g.keywords)) g.keywords = [];
    return r;
  }

  function personName(id) {
    const p = S.lib.people.find((x) => x.id === id);
    return p ? p.name : "";
  }

  Object.assign(RS, {
    pdfOf, themeItem,
    S, $app, $dlg, prefs, calm, EASE, DATA, NODE, ICON, APP, FILLED, icon, el, dots, btn, iconBtn, grip, jobsLink, themeBtn,
    api, MONTHS, monthText, span, thisMonth, ago, plural, clean, autosize, autosizeAll, flip, pulse,
    vanish, toast, closeMenus, menu, dialog, confirmBox, promptBox, swap, loadTemplates, tplList,
    tplDef, miniature, BLANK, normalise, personName,
  });
})();
