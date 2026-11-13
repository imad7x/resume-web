/* Which sections a resume has: the rail's list, adding, hiding, renaming,
 * reordering and custom sections. The drawing side is Resume.SECTIONS in render.js. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const { S, el, btn, icon, menu, dialog, confirmBox, promptBox, toast, tplDef, changed, field, pointsEditor } = RS;

  const META = {
    basics: { title: "Profile", icon: "user", about: "Name, headline, photo, contact details and the summary at the top of the page." },
    work: { icon: "briefcase", about: "Roles, newest first. Open one to edit it." },
    skills: { icon: "skills", about: "Skills in named groups. Type a skill and press Enter; click one to rename it; drag to reorder or move between groups." },
    education: { icon: "cap", about: "Degrees and schools, newest first." },
    certificates: { icon: "badge", about: "Name, who issued it, and when." },
    projects: { icon: "folder", about: "Side projects or notable work outside a role." },
    languages: { icon: "globe", about: "Languages spoken and how well." },
    volunteer: { icon: "heart", about: "Unpaid roles, community work, clubs and committees." },
    awards: { icon: "award", about: "Awards, scholarships, grants and honours." },
    publications: { icon: "book", about: "Papers, articles, talks and books." },
    references: { icon: "users", about: "People who can vouch for you. Many employers only ask for these later." },
    interests: { icon: "star", about: "Hobbies and interests, a word or two each." },
    personal: { icon: "id", about: "Details some employers expect, such as date of birth, nationality or languages known." },
    declaration: { icon: "pen", about: "The closing statement Indian employers and colleges often expect, with place and date." },
  };
  const CORE = ["work", "skills", "education", "certificates", "projects", "languages"];
  const EXTRA = ["volunteer", "awards", "publications", "references", "interests", "personal", "declaration"];
  const KINDS = { entries: ["Items with dates", "layers", "Like jobs: a title, a place, dates and what you did."],
    list: ["Simple list", "list", "One line per item."], text: ["Text", "text", "A paragraph."] };

  const customOf = (key) => S.doc.resume.custom.find((c) => "custom:" + c.id === key);
  const pref = (key) => (S.doc.design.sections || []).find((s) => s.key === key);

  function hasData(key) {
    const r = S.doc.resume;
    if (key === "personal") return r.basics.personal.length > 0;
    if (key === "declaration") return !!r.declaration.text;
    if (key.startsWith("custom:")) return !!customOf(key);
    return Array.isArray(r[key]) && r[key].length > 0;
  }

  /* The sections in the rail, in this version's order (Profile always comes first). */
  function railKeys() {
    const listed = (S.doc.design.sections || []).map((s) => s.key);
    const all = CORE.concat(EXTRA, S.doc.resume.custom.map((c) => "custom:" + c.id));
    const show = all.filter((k) => CORE.includes(k) || listed.includes(k) || hasData(k));
    const order = listed.filter((k) => show.includes(k));
    for (const k of show) if (!order.includes(k)) order.push(k);
    return order;
  }

  function sectionOf(key) {
    const cs = key.startsWith("custom:") ? customOf(key) : null;
    const meta = META[key] || { icon: cs ? KINDS[cs.kind][1] : "file", about: cs ? "A section of your own. " + KINDS[cs.kind][2] : "" };
    const def = tplDef(S.doc.design.template), p = pref(key);
    const own = key === "basics" ? "Profile" : cs ? cs.title : ((def.titles || {})[key] || (Resume.SECTIONS[key] || {}).title || key);
    return { key, icon: meta.icon, about: meta.about, title: (p && p.title) || own || "Untitled", own, custom: cs,
      hidden: !!(p && p.hidden) };
  }

  /* Write the order down, so it can be changed: every section this version shows gets a line. */
  function listed() {
    const d = S.doc.design, keys = ["summary", "contact"].concat(railKeys());
    d.sections = keys.map((key) => pref(key) || { key });
    return d.sections;
  }
  const ensure = (key) => { const all = listed(); if (!all.some((s) => s.key === key)) all.push({ key }); };
  function setOrder(keys) {
    const all = listed(), by = new Map(all.map((s) => [s.key, s]));
    S.doc.design.sections = ["summary", "contact"].concat(keys).filter((k) => by.has(k)).map((k) => by.get(k));
    changed();
    if (!tplDef(S.doc.design.template).frame) toast("This design keeps its own order. Newer designs follow yours.");
  }
  function patch(key, change) {
    const s = listed().find((x) => x.key === key);
    Object.assign(s, change);
    for (const k of Object.keys(s)) if (s[k] === "" || s[k] === false) delete s[k];
    changed();
    RS.renderRail();
  }

  async function addSection(anchor) {
    const have = railKeys();
    menu(anchor, [
      ...EXTRA.filter((k) => !have.includes(k)).map((k) => ({ label: Resume.SECTIONS[k].title, icon: META[k].icon, fn: () => {
        ensure(k);
        changed();
        RS.renderRail();
        RS.showSection(k);
      } })),
      "-",
      { label: "A section of your own…", icon: "plus", fn: newCustom },
    ]);
  }

  async function newCustom() {
    const title = el("input", { attrs: { maxlength: 60, placeholder: "e.g. Teaching, Patents, Speaking" } });
    const radio = (v, checked) => el("input", { type: "radio", name: "kind", value: v, checked });
    const made = await dialog({ title: "A section of your own", okLabel: "Add section", body: [
      el("label.field", {}, el("span", { text: "Heading" }), title),
      ...Object.entries(KINDS).map(([k, [name, , about]], i) => el("label.choice", {}, radio(k, i === 0),
        el("div", {}, el("b", { text: name }), el("small", { text: about })))),
    ], ok: () => {
      const t = title.value.trim();
      if (!t) { title.focus(); return undefined; }
      return { id: Math.random().toString(36).slice(2, 10), title: t, kind: document.querySelector("#dlg input[name=kind]:checked").value,
        items: [], lines: [], text: "" };
    } });
    if (!made) return;
    S.doc.resume.custom.push(made);
    ensure("custom:" + made.id);
    changed();
    RS.renderRail();
    RS.showSection("custom:" + made.id);
  }

  /* The ⋯ menu of a section's panel: rename, hide, move to the other column, remove. */
  function sectionMenu(anchor, key) {
    const s = sectionOf(key), def = tplDef(S.doc.design.template);
    const slots = def.slots ? Object.keys(def.slots) : [];
    const now = def.frame ? (Resume.plan(def, Resume.tidy(S.doc.resume), Object.assign({}, S.doc.design, { sections: [] }))
      .concat(Resume.plan(def, Resume.tidy(S.doc.resume), S.doc.design)).filter((c) => c.key === key).pop() || {}).slot : "";
    const names = { side: "the side column", main: "the main column" };
    menu(anchor, [
      { label: "Rename heading", icon: "edit", fn: async () => {
        const t = await promptBox("Rename heading", "Heading on the page", s.title);
        if (t == null) return;
        if (s.custom) { s.custom.title = t; changed(); RS.renderRail(); } else patch(key, { title: t === s.own ? "" : t });
        RS.showSection(key, true);
      } },
      { label: s.hidden ? "Show on this version" : "Hide on this version", icon: s.hidden ? "eye" : "eyeoff", fn: () => { patch(key, { hidden: !s.hidden }); RS.showSection(key, true); } },
      ...(slots.length > 1 ? slots.filter((n) => n !== now).map((n) => ({ label: "Move to " + (names[n] || n), icon: "columns", fn: () => {
        S.doc.design.place = Object.assign({}, S.doc.design.place, { [key]: n });
        changed();
      } })) : []),
      "-",
      s.custom ? { label: "Delete section", icon: "trash", danger: true, fn: async () => {
        if (!await confirmBox(`Delete “${s.title}”?`, "The section and everything in it is removed from this version.")) return;
        const r = S.doc.resume;
        r.custom.splice(r.custom.indexOf(s.custom), 1);
        S.doc.design.sections = (S.doc.design.sections || []).filter((x) => x.key !== key);
        changed();
        RS.renderRail();
        RS.showSection("work");
      } } : (CORE.includes(key) ? null : { label: "Remove from the list", icon: "x", disabled: hasData(key), fn: () => {
        S.doc.design.sections = (S.doc.design.sections || []).filter((x) => x.key !== key);
        changed();
        RS.renderRail();
        RS.showSection("work");
      } }),
    ]);
  }

  // ---- the panels of sections that are not lists of entries or rows
  function declarationPanel() {
    const d = S.doc.resume.declaration;
    const usual = "I hereby declare that the information given above is true and correct to the best of my knowledge.";
    const text = field("Statement", d, "text", { multiline: true, rows: 3, wide: true });
    return [RS.panelHead("declaration", btn("Use the usual wording", "small soft", () => {
      d.text = usual;
      text.querySelector("textarea").value = usual;
      changed();
    })),
    el("div.box.box-pad", {}, el("div.grid", {}, text,
      field("Place", d, "place", { placeholder: "e.g. Bangalore" }),
      field("Date", d, "date", { placeholder: "Leave empty to fill in by hand" }))),
    el("p.hint", { text: "Your name is printed on the right as the signature line." })];
  }

  function customPanel(key) {
    const cs = customOf(key);
    if (cs.kind === "entries") return RS.listPanel(customCfg(key, cs));
    if (cs.kind === "text") {
      return [RS.panelHead(key), el("div.box.box-pad", {}, el("div.grid", {},
        field("Text", cs, "text", { multiline: true, rows: 5, wide: true, hint: "Wrap words in **double stars** to make them bold." })))];
    }
    return [RS.panelHead(key), el("div.box.box-pad", {}, pointsEditor(cs, "lines", () => {}, { head: null }))];
  }
  const customCfg = (key, cs) => ({
    key, list: () => cs.items, add: "Add item", noun: "item", points: "points", empty: "Nothing here yet.",
    blank: () => ({ title: "", sub: "", where: "", startDate: "", endDate: "", text: "", points: [] }),
    head: (x) => [x.title, [x.sub, RS.span(x)].filter(Boolean).join(" · "), x.points.filter((p) => p.trim()).length],
    placeholder: "New entry",
    fields: (x) => [
      field("Title", x, "title"),
      field("Organisation or place", x, "sub", { placeholder: "Optional" }),
      field("Description", x, "text", { multiline: true, rows: 2, wide: true, placeholder: "Optional" }),
      RS.dates(x, false),
    ],
  });

  Object.assign(RS, { META, CORE, railKeys, sectionOf, hasData, setOrder, addSection, sectionMenu, declarationPanel, customPanel, sectionPatch: patch });
})();
