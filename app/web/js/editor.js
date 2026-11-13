/* The editor frame: top bar, section rail, the open section's panel. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    S, $app, APP, prefs, icon, el, btn, iconBtn, api, autosize, autosizeAll, toast, menu, swap, normalise,
    changed, flush, setStatus, duplicate, exportJson,
  } = RS;

  // ----------------------------------------------------------------- editor
  async function openResume(id) {
    if (S.doc && S.doc.id === id) return;
    let doc;
    try {
      [doc] = await Promise.all([api("resumes/" + id), S.lib.people.length ? null : RS.refreshLibrary()]);
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
    RS.undoStart();
    const last = prefs.get("section");
    S.section = last === "basics" || RS.railKeys().includes(last) ? last : "work";
    if (S.doc.owner !== S.person) { S.person = S.doc.owner; prefs.set("person", S.person); }
    swap(renderEditor);
  }

  function renderEditor() {
    const doc = S.doc;
    document.body.classList.add("editing");
    document.title = doc.title + " · " + APP;
    const title = el("input.title-input", { value: doc.title, attrs: { "aria-label": "Resume name", maxlength: 80,
      title: "The name of this version (only shown here; the PDF is named after the person)" },
      on: { input: (e) => { doc.title = e.target.value; document.title = doc.title + " · " + APP; changed({ noPreview: true }); } } });
    const score = el("button.score-pill", { type: "button", attrs: { title: "How strong is this resume? Open the checks" },
      on: { click: () => RS.openScore() } }, el("span.ring"), el("span.score-text", { text: "Check" }));
    const bar = el("header.topbar", {},
      iconBtn("back", "All resumes", () => { location.hash = "#/"; }),
      title,
      el("span.status.ok#status", { text: "Saved" }),
      el("span.spacer"),
      el("span.undo-pair.hide-narrow", {},
        iconBtn("undo", "Undo (Ctrl+Z)", () => RS.undo()),
        iconBtn("redo", "Redo (Ctrl+Shift+Z)", () => RS.redo())),
      score,
      btn("Design", "ghost hide-narrow", () => RS.openDesign(), "palette", "Layout, colours, fonts and spacing"),
      btn("Job match", "ghost hide-narrow", () => RS.openMatch(), "target", "Paste a job ad: see what this resume is missing for it"),
      btn("History", "ghost hide-narrow", RS.openHistory, "history", "Earlier versions"),
      iconBtn("more", "More", (e) => menu(e.currentTarget, [
        { label: "Undo", icon: "undo", fn: () => RS.undo() },
        { label: "Redo", icon: "redo", fn: () => RS.redo() },
        "-",
        { label: "Design", icon: "palette", fn: () => RS.openDesign() },
        { label: "Check this resume", icon: "gauge", fn: () => RS.openScore() },
        { label: "Job match", icon: "target", fn: () => RS.openMatch() },
        { label: "History", icon: "history", fn: RS.openHistory },
        "-",
        { label: "Open PDF in a new tab", icon: "eye", fn: async () => { await flush(); RS.pdfOf(doc.id, true); } },
        { label: "Duplicate", icon: "copy", fn: async () => { await flush(); duplicate({ id: doc.id }); } },
        { label: "Export JSON", icon: "file", fn: () => exportJson(doc) },
        "-",
        RS.themeItem(),
      ])),
      RS.jobsLink(),
      el("button.btn.primary", { type: "button", on: { click: downloadPdf }, attrs: { title: "Download PDF" } },
        icon("download"), el("span.dl-long", { text: "Download " }), "PDF"));

    const rail = el("nav.rail", { attrs: { "aria-label": "Sections" } });
    const inner = el("div.form-inner");
    const pane = el("section.form-pane", { attrs: { "aria-label": "Editor" } }, inner);
    const workspace = el("div.workspace", {}, rail, pane, RS.previewPane());
    /* Phones: a tab bar at the bottom (Edit, Preview, Design, Check); hidden on wide screens. */
    const tab = (id, ic, label, fn) => el("button", { type: "button", attrs: { "data-tab": id }, on: { click: fn } },
      icon(ic), el("span", { text: label }));
    const toggle = el("nav.tabbar", { attrs: { "aria-label": "Views" } },
      tab("edit", "edit", "Edit", () => { RS.closeDrawer(); setView(false); }),
      tab("preview", "eye", "Preview", () => { RS.closeDrawer(); setView(true); }),
      tab("design", "palette", "Design", () => RS.openDesign()),
      tab("check", "gauge", "Check", () => RS.openScore()),
      tab("match", "target", "Match", () => RS.openMatch()));
    S.ui = { rail, pane, inner, workspace, toggle, score };
    S.drawer = null;
    $app.replaceChildren(bar, workspace, toggle);
    renderRail();
    showSection(S.section, true);
    RS.drawPreview();
    const [u, r] = bar.querySelectorAll(".undo-pair .icon-btn");
    u.dataset.undo = "undo";
    r.dataset.undo = "redo";
    RS.undoButtons();
    syncTabs();
    // the home screen's "Resume check" and "Change design" tiles open the editor with that drawer
    const then = RS.afterOpen;
    RS.afterOpen = null;
    if (then) requestAnimationFrame(() => (then === "check" ? RS.openScore() : then === "match" ? RS.openMatch() : RS.openDesign()));
  }

  /* The rail: Profile, then this version's sections (drag to reorder), then "Add section". */
  function renderRail() {
    if (!S.ui) return;
    const item = (key) => {
      const s = RS.sectionOf(key);
      return el("button.rail-item" + (s.hidden ? ".is-hidden" : ""), { type: "button", attrs: { "data-key": key, title: s.hidden ? s.title + " (hidden on this version)" : s.title },
        on: { click: () => showSection(key) } }, icon(s.icon), el("span.label", { text: s.title }), el("span.n"),
      key === "basics" ? null : el("span.grip", { attrs: { title: "Drag to reorder" } }, icon("grip")));
    };
    const list = el("div.rail-list", {}, RS.railKeys().map(item));
    RS.sortable(list, { item: ".rail-item", handle: ".grip", drop: () => {
      RS.setOrder([...list.children].map((n) => n.dataset.key).filter(Boolean));
      updateRail();
    } });
    S.ui.rail.replaceChildren(
      el("div.rail-label", { text: "Sections" }),
      item("basics"), list,
      el("button.rail-add", { type: "button", on: { click: (e) => RS.addSection(e.currentTarget) } }, icon("plus"), el("span.label", { text: "Add section" })),
      el("div.rail-foot", {}, el("div", {}, el("kbd", { text: "Enter" }), " next line"),
        el("div", {}, el("kbd", { text: "Ctrl" }), "+", el("kbd", { text: "S" }), " keep a version")));
    updateRail();
  }

  function setView(preview) {
    S.ui.workspace.classList.toggle("show-preview", preview);
    syncTabs();
    if (preview) requestAnimationFrame(RS.layoutPreview);
  }
  /* Light the tab for what is on screen: an open drawer (design, check) wins over edit/preview. */
  function syncTabs() {
    if (!S.ui || !S.ui.toggle) return;
    const kind = S.drawer && S.drawer.kind;
    const on = kind === "design" ? "design" : kind === "score" ? "check" : kind === "match" ? "match"
      : S.ui.workspace.classList.contains("show-preview") ? "preview" : "edit";
    for (const b of S.ui.toggle.children) {
      b.classList.toggle("on", b.dataset.tab === on);
      b.setAttribute("aria-current", b.dataset.tab === on ? "page" : "false");
    }
  }

  async function downloadPdf() {
    await flush();
    setStatus("Making PDF…", "busy");
    const done = RS.pdfOf(S.doc.id);
    setTimeout(() => setStatus("Saved", "ok"), 1800);
    await done;
  }

  function count(key) {
    const r = S.doc.resume;
    if (key === "personal") return r.basics.personal.length;
    if (key.startsWith("custom:")) { const c = RS.sectionOf(key).custom; return c ? c.items.length + c.lines.length : 0; }
    return Array.isArray(r[key]) ? r[key].length : 0;
  }

  function updateRail() {
    if (!S.ui) return;
    for (const b of S.ui.rail.querySelectorAll(".rail-item")) {
      const key = b.dataset.key, n = count(key);
      const badge = b.querySelector(".n");
      badge.textContent = n || "";
      badge.hidden = !n;
      b.classList.toggle("on", key === S.section);
    }
  }

  function showSection(key, force) {
    if (key === S.section && !force && S.ui.inner.firstChild) return;
    const keys = ["basics"].concat(RS.railKeys());
    if (!keys.includes(key)) key = "work";
    S.section = key;
    prefs.set("section", key);
    const body = key === "basics" ? RS.profilePanel() : key === "skills" ? RS.skillsPanel()
      : key === "declaration" ? RS.declarationPanel() : key.startsWith("custom:") ? RS.customPanel(key)
        : RS.LISTS[key] ? RS.listPanel(RS.LISTS[key]) : RS.rowsPanel(RS.ROWS[key]);
    const i = keys.indexOf(key);
    const prev = keys[i - 1] && RS.sectionOf(keys[i - 1]), next = keys[i + 1] && RS.sectionOf(keys[i + 1]);
    const nav = el("div.panel-nav", {},
      prev ? btn(prev.title, "ghost", () => showSection(prev.key), "left") : el("span"),
      next ? el("button.btn.ghost", { type: "button", on: { click: () => showSection(next.key) } }, next.title, icon("right")) : el("span"));
    if (RS.closeSheet) RS.closeSheet();
    S.ui.inner.replaceChildren(el("div.panel", {}, body, nav));
    S.ui.pane.scrollTop = 0;
    autosizeAll(S.ui.inner);
    updateRail();
  }

  function panelHead(key, ...tools) {
    const s = RS.sectionOf(key);
    return el("div.panel-head", {},
      el("div", {}, el("h2", {}, s.title, s.hidden ? el("span.badge", { text: "Hidden on this version" }) : null), el("p", { text: s.about })),
      tools,
      key === "basics" ? null : iconBtn("more", "Section options", (e) => RS.sectionMenu(e.currentTarget, key)));
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

  Object.assign(RS, {
    openResume, renderEditor, renderRail, setView, syncTabs, downloadPdf, updateRail, showSection,
    panelHead, field,
  });
})();
