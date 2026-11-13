/* The design drawer (layouts and style) and the gallery of designs it shares with the home screen. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const { S, el, btn, icon, iconBtn, tplList, tplDef, miniature, setView, setDesign, toast, changed } = RS;

  const SWATCHES = ["#2563eb", "#1e3a5f", "#2b3350", "#0e7490", "#0f766e", "#047857", "#6d28d9", "#be123c", "#7f1d1d", "#b45309", "#37373a", "#111827"];
  const FILTERS = [["all", "All"], ["photo", "With photo"], ["sidebar", "Sidebar"], ["simple", "One column"], ["ats", "ATS-safe"],
    ["student", "Student"], ["academic", "Academic"], ["creative", "Creative"]];
  const ATS = { high: "Reads well in application systems", medium: "Columns: most systems cope, some jumble the order", low: "For people, not for upload forms" };
  const matches = (t, f) => f === "all" || (f === "ats" ? t.ats === "high" : (t.tags || []).includes(f));

  /* Draw into `host` once it scrolls into view (a gallery holds a couple of dozen pages). */
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.target._lazy) { const fn = e.target._lazy; e.target._lazy = null; seen.unobserve(e.target); fn(); }
  }, { rootMargin: "300px" });
  function lazy(node, fn) { node._lazy = fn; seen.observe(node); }

  /* A grid of designs with filter chips. opts: content(t) -> {resume, design} to draw, pick(t), current() -> id, small */
  function gallery(opts) {
    let filter = "all";
    const chips = el("div.chips-row", { attrs: { role: "group", "aria-label": "Kind of design" } });
    const grid = el("div.gallery" + (opts.small ? ".small" : ""));
    const cards = tplList().map((t) => {
      const host = el("div.host"), mini = el("div.mini", {}, host);
      const node = el("button.tpl", { type: "button", attrs: { "data-id": t.id }, on: { click: () => opts.pick(t) } },
        mini,
        el("span.tpl-meta", {}, el("span.tpl-name", { text: t.name }),
          (t.tags || []).includes("photo") ? el("span.tag", { text: "Photo" }) : null,
          t.ats === "high" ? el("span.tag.good", { text: "ATS-safe" }) : null),
        opts.small ? null : el("span.tpl-desc", { text: t.description || "" }));
      const draw = () => { const c = opts.content(t); miniature(host, mini, c.resume, c.design); };
      lazy(node, () => { node._drawn = true; draw(); });
      return { t, node, draw };
    });
    grid.append(...cards.map((c) => c.node));
    function refresh(redraw) {
      chips.replaceChildren(...FILTERS.map(([id, name]) => el("button.chip-f" + (id === filter ? ".on" : ""), { type: "button", text: name,
        on: { click: () => { filter = id; refresh(); } } })));
      const cur = opts.current ? opts.current() : "";
      for (const c of cards) {
        c.node.hidden = !matches(c.t, filter);
        c.node.classList.toggle("on", c.t.id === cur);
        if (redraw && c.node._drawn && !c.node.hidden) c.draw();
      }
    }
    refresh();
    return { node: el("div.gallery-wrap", {}, chips, grid), refresh };
  }

  // ------------------------------------------------------------ the drawer
  function closeDrawer() {
    if (!S.drawer) return;
    const d = S.drawer.node;
    S.drawer = null;
    d.classList.add("closing");
    d.addEventListener("animationend", () => d.remove(), { once: true });
    RS.syncTabs();
  }
  /* One drawer at a time. dock "form" lays it over the form (the page stays in view), "page" over the preview. */
  function openDrawer(kind, title, body, dock, refresh) {
    const same = S.drawer && S.drawer.kind === kind;
    if (S.drawer) { S.drawer.node.remove(); S.drawer = null; }
    if (same) { RS.syncTabs(); return null; }
    const node = el("aside.drawer.dock-" + dock, { attrs: { "aria-label": title } },
      el("div.drawer-head", {}, el("h2", { text: title }), iconBtn("x", "Close", closeDrawer)), body);
    S.drawer = { kind, node, refresh: refresh || (() => {}) };
    S.ui.workspace.append(node);
    RS.syncTabs();
    return node;
  }

  const slider = (label, key, min, max, step, show, only) => ({ label, key, min, max, step, show, only });
  const SLIDERS = [
    slider("Text size", "scale", 0.85, 1.2, 0.025, (v) => Math.round(v * 100) + "%"),
    slider("Spacing", "spacing", 0.7, 1.4, 0.05, (v) => (v === 1 ? "Normal" : v < 1 ? "Tighter" : "Roomier"), "v2"),
    slider("Page margins", "margins", 0.6, 1.5, 0.05, (v) => (v === 1 ? "Normal" : v < 1 ? "Narrower" : "Wider"), "v2"),
  ];

  /* How many pages a design would need, measured on a page drawn out of sight. */
  let probe = null;
  function pagesFor(design) {
    if (!probe) {
      const host = el("div.probe");
      document.body.append(host);
      probe = Resume.mount(host);
    }
    const def = tplDef(design.template), L = probe(S.doc.resume, design);
    const pad = def.frame ? L.margin / L.zoom : 0, tall = probe.doc.offsetHeight;
    return tall - pad <= L.first + 2 ? 1 : 1 + Math.ceil((tall - pad - L.first - 2) / L.next);
  }
  /* Shrink text and spacing just enough for the resume to fit `want` pages. */
  function fitTo(want) {
    const d = S.doc.design, v2 = !!tplDef(d.template).frame, tries = [];
    for (const spacing of v2 ? [1, 0.9, 0.8, 0.7] : [1]) {
      for (let scale = 1.05; scale >= 0.849; scale -= 0.025) tries.push({ scale: +scale.toFixed(3), spacing, cost: (1.05 - scale) * 2 + (1 - spacing) });
    }
    tries.sort((a, b) => a.cost - b.cost);
    const fits = tries.find((t) => pagesFor(Object.assign({}, d, t)) <= want);
    const use = fits || tries[tries.length - 1];
    setDesign({ scale: use.scale, spacing: use.spacing });
    if (fits) toast(`Fits ${want === 1 ? "one page" : want + " pages"} at ${Math.round(use.scale * 100)}% text size`);
    else toast(`Still ${pagesFor(S.doc.design)} pages at the smallest size. Hide a section or cut a few lines.`);
  }

  function openDesign() {
    if (innerWidth <= 900) setView(true);
    const design = S.doc.design;
    let tab = RS.prefs.get("designTab") === "style" ? "style" : "designs";
    const tabs = el("div.seg.drawer-tabs");
    const body = el("div.drawer-body");
    const g = gallery({ small: true, current: () => design.template,
      content: (t) => ({ resume: S.doc.resume, design: Object.assign({}, design, { template: t.id, sections: design.sections }) }),
      pick: (t) => { setDesign({ template: t.id }); } });
    const custom = el("input", { type: "color", attrs: { title: "Any colour", "aria-label": "Any colour" },
      on: { input: (e) => setDesign({ accent: e.target.value }) } });
    const style = el("div.style-tab");

    function drawStyle() {
      const def = tplDef(design.template), v2 = !!def.frame, photo = (def.tags || []).includes("photo");
      const seg = (key, options) => el("div.seg.wrap", {}, options.map(([v, t]) =>
        el("button" + ((design[key] === undefined ? "" : design[key]) === v ? ".on" : ""), { type: "button", text: t,
          on: { click: () => setDesign({ [key]: v === "" ? undefined : v }) } })));
      const range = (o) => {
        const value = typeof design[o.key] === "number" ? design[o.key] : 1;
        const out = el("output", { text: o.show(value) });
        const input = el("input", { type: "range", min: o.min, max: o.max, step: o.step, value, attrs: { "aria-label": o.label },
          on: { input: () => { const v = +input.value; out.textContent = o.show(v); setDesign({ [o.key]: v === 1 ? undefined : v }); } } });
        return el("label.range", {}, el("span", { text: o.label }), input, out);
      };
      style.replaceChildren(...[
        el("section", {}, el("h3", { text: "Fit" }),
          el("div.fit-row", {}, btn("Fit to one page", "small", () => fitTo(1), "check"), btn("Fit to two pages", "small", () => fitTo(2), "check")),
          el("p.hint", { text: "Shrinks text and spacing only as much as needed." })),
        el("section", {}, el("h3", { text: "Colour" }),
          el("div.swatches", {},
            el("button.btn.small" + (!design.accent ? ".primary" : ""), { type: "button", text: "Design’s own", on: { click: () => setDesign({ accent: "" }) } }),
            ...SWATCHES.map((c) => {
              const s = el("button.swatch" + ((design.accent || "").toLowerCase() === c ? ".on" : ""), { type: "button",
                attrs: { title: c, "aria-label": "Accent " + c }, on: { click: () => setDesign({ accent: c }) } });
              s.style.background = c;
              return s;
            }), custom)),
        el("section", {}, el("h3", { text: "Size and spacing" }),
          ...SLIDERS.filter((o) => v2 || o.only !== "v2").map(range),
          v2 ? null : el("p.hint", { text: "Spacing, margins and fonts can be changed in the newer designs (Portrait, Director, Editorial, Masthead, ATS plain, Campus, Academic CV)." })),
        v2 ? el("section", {}, el("h3", { text: "Fonts" }),
          el("div.font-grid", {}, [["", { name: "Design’s own", head: (def.fonts || {}).head, body: (def.fonts || {}).body }]].concat(Object.entries(Resume.FONTS)).map(([id, f]) => {
            const b = el("button.font" + ((design.font || "") === id ? ".on" : ""), { type: "button", on: { click: () => setDesign({ font: id || undefined }) } },
              el("b", { text: "Aa" }), el("span", { text: f.name }));
            b.firstChild.style.fontFamily = `"${f.head}"`;
            return b;
          }))) : null,
        el("section", {}, el("h3", { text: "Dates" }),
          seg("dateFmt", [["", "Design’s own"], ["short", "Mar 2024"], ["long", "March 2024"], ["num", "03/2024"], ["year", "2024"]])),
        photo ? el("section", {}, el("h3", { text: "Photo" }),
          el("label.switch", {}, el("input", { type: "checkbox", checked: design.photo !== false,
            on: { change: (e) => setDesign({ photo: e.target.checked ? undefined : false }) } }), "Show the photo"),
          seg("photoShape", [["", "Design’s own"], ["round", "Round"], ["soft", "Soft corners"], ["square", "Square"]])) : null,
        el("section", {}, el("h3", { text: "Paper" }),
          seg("paper", [["a4", "A4"], ["letter", "US Letter"]])),
        el("section", {}, btn("Back to the design’s own style", "small ghost", () => {
          for (const k of ["scale", "spacing", "margins", "font", "dateFmt", "photoShape", "photo"]) delete design[k];
          design.accent = "";
          changed();
        }))].filter(Boolean));
      custom.value = design.accent || def.accent || "#2563eb";
    }

    function refresh() {
      tabs.replaceChildren(...[["designs", "Designs"], ["style", "Style"]].map(([id, name]) =>
        el("button" + (id === tab ? ".on" : ""), { type: "button", text: name, on: { click: () => { tab = id; RS.prefs.set("designTab", id); refresh(); } } })));
      body.replaceChildren(tab === "designs" ? g.node : style);
      if (tab === "designs") g.refresh(true); else drawStyle();
    }
    const node = openDrawer("design", "Design", el("div.drawer-fill", {}, tabs, body), "form", refresh);
    if (node) requestAnimationFrame(refresh);
  }

  let designTimer = 0;
  function refreshDesign() {
    if (!S.drawer) return;
    clearTimeout(designTimer);
    designTimer = setTimeout(() => S.drawer && S.drawer.refresh(), 300);
  }

  Object.assign(RS, { SWATCHES, ATS, gallery, lazy, openDrawer, closeDrawer, closeDesign: closeDrawer, openDesign, refreshDesign, pagesFor, fitTo });
})();
