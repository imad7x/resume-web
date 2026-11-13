/* The live page preview and click-to-edit. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    S, prefs, calm, NODE, icon, el, plural, clean, pulse, tplDef, changed, setView,
    showSection,
  } = RS;

  // ---------------------------------------------------------------- preview

  function previewPane() {
    const host = el("div.host");
    const sheet = el("div.sheet", {}, host);
    const stage = el("div.stage", {}, sheet);
    const draw = Resume.mount(host);
    const pages = el("span.pages");
    const tplName = el("span");
    const zoom = el("div.seg", { attrs: { role: "group", "aria-label": "Zoom" } },
      [["fit", "Fit"], ["100", "100%"]].map(([v, t]) => el("button", { type: "button", text: t, attrs: { "data-v": v },
        on: { click: () => { S.pv.zoom = v; prefs.set("zoom", v); layoutPreview(); } } })));
    const banner = el("div.pv-banner", { hidden: true });
    const hint = el("div.pv-hint", { text: "Click anything on the page to edit it" });
    if (prefs.get("hinted")) hint.hidden = true;
    else setTimeout(() => { hint.classList.add("off"); prefs.set("hinted", "1"); }, 5000);
    S.pv = { host, sheet, stage, draw, pages, tplName, banner, marks: [], zoomBox: zoom,
      zoom: prefs.get("zoom") === "100" ? "100" : "fit" };
    host.shadowRoot.addEventListener("click", previewClick);
    new ResizeObserver(() => layoutPreview()).observe(stage);
    new ResizeObserver(() => layoutPreview()).observe(draw.doc);
    return el("section.preview-pane", { attrs: { "aria-label": "Preview" } },
      el("div.pv-bar", {},
        el("button.btn.small.ghost", { type: "button", attrs: { title: "Template, colour and paper" }, on: { click: () => RS.openDesign() } },
          icon("palette"), tplName, icon("chev")),
        el("span.spacer"), pages, zoom),
      banner, stage, hint);
  }

  let pvRaf = 0;
  function drawPreview() {
    if (!S.pv || pvRaf) return;
    pvRaf = requestAnimationFrame(() => {
      pvRaf = 0;
      if (!S.pv || !S.doc) return;
      const src = S.viewing || S.doc;
      try {
        S.pv.draw(src.resume, src.design);
      } catch (err) {
        S.pv.draw.doc.textContent = String(err.message || err);
      }
      layoutPreview();
      RS.refreshDesign();
      if (RS.refreshScore) RS.refreshScore();
    });
  }

  function layoutPreview() {
    if (!S.pv || !S.pv.stage.isConnected || !S.doc) return;
    const src = S.viewing || S.doc;
    const def = tplDef(src.design.template);
    const L = Resume.layout(def, src.design.paper, src.design);
    const width = Resume.width(def, src.design), height = S.pv.draw.doc.offsetHeight;
    const cs = getComputedStyle(S.pv.stage);
    const room = S.pv.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (room <= 0 || !height) return;
    const scale = S.pv.zoom === "fit" ? Math.min(1.25, room / width) : 1;
    S.pv.host.style.width = width + "px";
    S.pv.host.style.transform = `scale(${scale})`;
    S.pv.sheet.style.width = width * scale + "px";
    S.pv.sheet.style.height = height * scale + "px";
    const at = [];
    const pad = def.frame ? L.margin / L.zoom : 0;       // a v2 page ends with its bottom margin
    for (let y = L.first; y < height - pad - 4; y += L.next) at.push(y);
    while (S.pv.marks.length > at.length) S.pv.marks.pop().remove();
    while (S.pv.marks.length < at.length) {
      const m = el("div.page-mark", {}, el("span", { text: "Page " + (S.pv.marks.length + 2) }));
      S.pv.sheet.append(m);
      S.pv.marks.push(m);
    }
    at.forEach((y, i) => { S.pv.marks[i].style.top = y * scale + "px"; });
    S.pv.pages.textContent = `${plural(at.length + 1, "page")} · ${src.design.paper === "letter" ? "US Letter" : "A4"}`;
    S.pv.tplName.textContent = def.name;
    for (const b of S.pv.zoomBox.children) b.classList.toggle("on", b.dataset.v === S.pv.zoom);
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
      if (/^(summary|contact|about|profile)$/.test(text)) return jumpTo({ section: "basics" });
      const sec = RS.railKeys().find((k) => clean(RS.sectionOf(k).title) === text);
      if (sec) return jumpTo({ section: sec });
    }
    // nothing matched by its text: the section the click landed in (new-style designs mark them)
    const box = e.target.closest && e.target.closest("[data-sec]");
    if (box) {
      const key = box.dataset.sec;
      jumpTo({ section: key === "summary" || key === "contact" ? "basics" : key });
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
      target = S.ui.inner.querySelector(`[data-k="${t.field === "city" ? "city" : t.field}"]`);
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
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete S.doc.design[k];
    changed();
  }

  Object.assign(RS, {
    previewPane, drawPreview, layoutPreview, previewClick, jumpTo, setDesign,
  });
})();
