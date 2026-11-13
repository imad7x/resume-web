/* The library: one tab per person and their resume versions. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    S, $app, $dlg, APP, prefs, icon, el, btn, iconBtn, api, ago, plural, toast, menu, dialog, confirmBox,
    promptBox, tplDef, miniature, BLANK, personName,
  } = RS;

  // ------------------------------------------------------------------- home
  const brand = () => el("a.brand", { href: "#/" }, el("span.mark", {}, icon("logo")), el("span.brand-name", { text: APP }));
  const thumbs = new Map();     // id -> {updated, doc}
  const docOf = (r) => {
    const cached = thumbs.get(r.id);
    if (cached && cached.updated === r.updated) return Promise.resolve(cached.doc);
    return api("resumes/" + r.id).then((doc) => { thumbs.set(r.id, { updated: r.updated, doc }); return doc; });
  };
  const greeting = () => { const h = new Date().getHours(); return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  /* A page lying on the desk: a resume drawn small, the top of it showing. */
  function sheet(cls, content) {
    const host = el("div.host"), box = el("div.desk-sheet" + cls, {}, host);
    Promise.resolve(content).then((c) => requestAnimationFrame(() => miniature(host, box, c.resume, c.design))).catch(() => {});
    return box;
  }

  /* The resume check's 0–100 for a stored resume (same rules as the editor's check). */
  const scoreOf = (doc) => Smart.check(RS.normalise(JSON.parse(JSON.stringify(doc.resume))), { ats: tplDef(doc.design.template).ats || "medium" }).score;
  const tone = (n) => (n >= 80 ? "good" : n >= 60 ? "fair" : "low");
  /* "90/100" as a small chip, filled in once the resume is loaded. */
  function scoreChip(doc, cls) {
    const chip = el("span.score-chip" + (cls || ""), { hidden: true });
    Promise.resolve(doc).then((d) => {
      const n = scoreOf(d);
      chip.replaceChildren(el("b", { text: String(n) }), el("small", { text: "/100" }));
      chip.title = `Resume check: ${n} of 100`;
      chip.classList.add(tone(n));
      chip.hidden = false;
    }).catch(() => {});
    return chip;
  }
  /* Open a resume, then (optionally) its design drawer or its check. */
  function openWith(id, then) {
    RS.afterOpen = then || null;
    location.hash = "#/r/" + id;
  }

  function renderLibrary() {
    document.title = APP;
    document.body.classList.remove("editing", "sheet-open");
    const who = personName(S.person);
    const tabs = el("nav.tabs", { attrs: { "aria-label": "Whose resumes" } },
      S.lib.people.map((p) => el("button.tab" + (p.id === S.person ? ".on" : ""), {
        type: "button", text: p.name, on: { click: () => {
          if (p.id === S.person) return;
          S.person = p.id;
          prefs.set("person", p.id);
          renderLibrary();
        } } })),
      el("button.tab.add", { type: "button", attrs: { title: "Add a person", "aria-label": "Add a person" },
        on: { click: addPerson } }, icon("plus")));

    const mine = S.lib.resumes.filter((r) => r.owner === S.person).sort((a, b) => (a.updated < b.updated ? 1 : -1));
    const latest = mine[0];
    const nTpl = Object.keys(Resume.templates).length;
    const ex = (id, template) => ({ resume: Examples.list[id], design: { template, paper: "a4" } });
    // on the desk: the latest resume, and behind it the same content in another design
    const front = latest ? docOf(latest) : ex("marketing", "portrait");
    const back = latest ? docOf(latest).then((doc) => ({ resume: doc.resume,
      design: Object.assign({}, doc.design, { template: doc.design.template === "director" ? "portrait" : "director", accent: "" }) })) : ex("creative", "director");
    const hero = el("section.hero", {},
      el("header.topbar", {}, brand(), S.lib.people.length && !RS.PUBLIC ? tabs : null, el("span.spacer"),
        RS.themeBtn(), RS.jobsLink(),
        RS.PUBLIC ? iconBtn("more", "More", (e) => personMenu(e.currentTarget, null))
          : who ? iconBtn("more", "Rename or remove " + who, (e) => personMenu(e.currentTarget, S.lib.people.find((p) => p.id === S.person))) : null),
      el("div.hero-in", {},
        el("div.hero-text", {},
          el("h1", { text: !who ? "Welcome." : latest ? `Welcome back, ${who}.` : `${greeting()}, ${who}.` }),
          latest ? null : el("p", { text: !S.lib.people.length ? "Add a person to start." : "Add your details, pick a design, then download the PDF." }),
          latest ? null : el("div.hero-actions", {},
            !S.lib.people.length ? btn("Add a person", "primary big", addPerson, "user") : null,
            S.lib.people.length ? btn("New resume", "primary big", newResume, "plus") : null,
            S.lib.people.length ? btn("Import a file", "big on-dark", importFile, "upload", "Your resume as a PDF or Word file (also .odt, .txt, JSON Resume)") : null),
          RS.PUBLIC ? el("p.privacy", {}, icon("lock"), "Your resumes stay in this browser. A PDF is printed on our server and not kept.") : null),
        el("div.hero-desk", { attrs: { "aria-hidden": "true" } }, sheet(".back", back), sheet(".front", front))));

    const g = S.lib.people.length ? RS.gallery({
      content: (t) => ex(t.example || "engineer", t.id),
      pick: (t) => designDialog(t),
    }) : null;
    $app.replaceChildren(hero,
      el("main.lib", {},
        latest ? el("section.lib-sec.now", {}, continueCard(latest), quickTiles(latest, nTpl)) : null,
        mine.length ? el("section.lib-sec", {},
          el("div.lib-head", {}, el("div", {}, el("h2", { text: "Your resumes" }),
            el("p", { text: mine.length === 1 ? "1 version" : mine.length + " versions" })),
            S.lib.trash ? btn(`Deleted (${S.lib.trash})`, "ghost small lib-trash", trashDialog, "trash", "Restore a deleted resume") : null),
          el("div.cards", {}, mine.map(card))) : null,
        g ? el("section.lib-sec#designs", {},
          el("div.lib-head", {}, el("div", {}, el("h2", { text: "Start from a design" }),
            el("p", { text: `${nTpl} layouts` }))),
          g.node) : null));
  }

  /* The one you were working on: the top of its first page, what it is, and the way back in. */
  function continueCard(r) {
    const def = tplDef(r.template);
    const doc = docOf(r);
    const host = el("div.host"), shot = el("div.cont-shot", {}, host);
    doc.then((d) => requestAnimationFrame(() => miniature(host, shot, d.resume, d.design))).catch(() => {});
    const open = () => openWith(r.id);
    return el("article.continue.glass", { tabIndex: 0, on: {
      click: (e) => { if (!e.target.closest("button")) open(); },
      keydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) open(); },
    } },
      shot,
      el("div.cont-body", {},
        el("span.kicker", { text: "Last edited" }),
        el("h2", { text: r.title }),
        el("div.cont-meta", {}, el("span", { text: `${def.name} · ${plural(r.jobs, "role")} · edited ${ago(r.updated)}` }), scoreChip(doc)),
        el("div.cont-actions", {},
          btn("Continue editing", "primary", open, "edit"),
          btn("PDF", "ghost", () => RS.pdfOf(r.id), "download", "Download PDF"),
          el("span.spacer"),
          iconBtn("trash", "Delete this resume", () => discard(r), "cont-del"))));
  }

  /* Four ways to go on: slim tiles on wide screens, a row of small icon buttons on phones (short labels). */
  function quickTiles(latest, nTpl) {
    const tile = (ic, title, short, about, fn) => el("button.tile", { type: "button", attrs: { title: about, "aria-label": title }, on: { click: fn } },
      el("span.tile-ic", {}, icon(ic)),
      el("span.tile-text", {}, el("b.t-long", { text: title }), el("b.t-short", { text: short }), el("small", { text: about })));
    return el("div.bento", {},
      tile("plus", "New resume", "New", "Start another version", newResume),
      tile("gauge", "Resume check", "Check", "Score and what to fix", () => openWith(latest.id, "check")),
      tile("palette", "Change design", "Design", `${nTpl} layouts`, () => openWith(latest.id, "design")),
      tile("upload", "Import a file", "Import", "PDF or Word", importFile));
  }

  function card(r) {
    const def = tplDef(r.template);
    const host = el("div.host");
    const thumb = el("div.thumb", {}, host);
    const doc = docOf(r);
    const open = () => { location.hash = "#/r/" + r.id; };
    const node = el("article.card", { tabIndex: 0, on: {
      click: (e) => { if (!e.target.closest("button")) open(); },
      keydown: (e) => { if (e.key === "Enter" && e.target === e.currentTarget) open(); },
    } },
      thumb,
      el("div.card-body", {},
        el("div.card-title", { text: r.title }),
        el("div.card-meta", { text: `${def.name} · edited ${ago(r.updated)}` }),
        scoreChip(doc, ".card-score")),
      el("div.card-actions", {},
        btn("Edit", "small soft", open, "edit"),
        btn("PDF", "small ghost", () => RS.pdfOf(r.id), "download", "Download PDF"),
        el("span.spacer"),
        iconBtn("trash", "Delete this resume", () => discard(r), "sm"),
        iconBtn("more", "More", (e) => cardMenu(e.currentTarget, r), "sm")));
    doc.then((d) => requestAnimationFrame(() => miniature(host, thumb, d.resume, d.design))).catch(() => {});
    return node;
  }

  /* A design up close, and what to start it with. */
  async function designDialog(t) {
    const mineAll = S.lib.resumes;
    const host = el("div.host"), box = el("div.dd-sheet", {}, host);
    const example = Examples.list[t.example || "engineer"];
    const title = el("input", { attrs: { maxlength: 80, placeholder: "e.g. Product roles" } });
    const pick = el("select", {}, mineAll.map((r) => el("option", { value: r.id, text: (r.owner === S.person ? "" : personName(r.owner) + ": ") + r.title })));
    const radio = (value, checked) => el("input", { type: "radio", name: "from", value, checked });
    const show = async () => {
      const from = $dlg.querySelector("input[name=from]:checked").value;
      const resume = from === "copy" ? (await docOf(mineAll.find((r) => r.id === pick.value))).resume : example;
      miniature(host, box, resume, { template: t.id, paper: "a4" });
    };
    const body = el("div.dd", { on: { change: show } },
      el("div.dd-stage", {}, box),
      el("div.dd-side", {},
        el("h2", { text: t.name }),
        el("p.dd-desc", { text: t.description || "" }),
        el("ul.dd-facts", {},
          el("li", {}, icon(t.ats === "high" ? "check" : "eye"), RS.ATS[t.ats || "medium"]),
          (t.tags || []).includes("photo") ? el("li", {}, icon("image"), "Has a place for your photo") : null,
          t.frame ? el("li", {}, icon("layers"), "Sections can be reordered, renamed and moved between columns") : null),
        el("h3", { text: "Start with" }),
        mineAll.length ? el("label.choice", {}, radio("copy", true),
          el("div", {}, el("b", { text: "My details" }), el("small", { text: "The content of a resume you already have, in this design." }), pick)) : null,
        el("label.choice", {}, radio("example", !mineAll.length),
          el("div", {}, el("b", { text: "The example" }), el("small", { text: "The made-up person shown here. Replace their details with yours." }))),
        el("label.choice", {}, radio("blank", false),
          el("div", {}, el("b", { text: "A blank page" }), el("small", { text: "Just your name, ready to fill in." }))),
        el("label.field", {}, el("span", { text: "Name of this version" }), title)));
    requestAnimationFrame(show);
    const doc = await dialog({ title: "", wide: true, body, okLabel: "Use this design", ok: async () => {
      const from = $dlg.querySelector("input[name=from]:checked").value;
      const name = title.value.trim();
      if (from === "copy") {
        const made = await api("resumes", { owner: S.person, from: pick.value, title: name || undefined });
        await api("resumes/" + made.id, { rev: made.rev, design: Object.assign({}, made.design, { template: t.id, accent: "" }) });
        return made;
      }
      const resume = from === "example" ? Examples.get(t.example || "engineer") : BLANK();
      if (from === "blank") resume.basics.name = personName(S.person);
      return api("resumes", { owner: S.person, title: name || t.name, resume, design: { template: t.id } });
    } });
    if (doc) location.hash = "#/r/" + doc.id;
  }

  /* "New resume": the designs are the way in. */
  function newResume() {
    const g = document.getElementById("designs");
    if (!g) return;
    g.scrollIntoView({ behavior: "smooth", block: "start" });
    g.classList.remove("nudge");
    requestAnimationFrame(() => g.classList.add("nudge"));
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
        await RS.refreshLibrary(); renderLibrary();
      } },
      { label: "Export JSON", icon: "file", fn: async () => exportJson(await api("resumes/" + r.id)) },
      others.length ? "-" : null,
      others.length ? { label: "Move to" } : null,
      ...others.map((p) => ({ label: p.name, icon: "user", fn: async () => {
        const doc = await api("resumes/" + r.id);
        await api("resumes/" + r.id, { rev: doc.rev, owner: p.id });
        await RS.refreshLibrary(); renderLibrary();
        toast(`Moved to ${p.name}`);
      } })),
      "-",
      { label: "Delete", icon: "trash", danger: true, fn: () => discard(r) },
    ]);
  }

  /* One tap: the resume goes to Deleted resumes, and the toast offers Undo (no "are you sure" first). */
  async function discard(r) {
    S.lib = await api(`resumes/${r.id}/delete`, {});
    renderLibrary();
    toast(`“${r.title}” deleted`, "Undo", async () => {
      const key = ((await api("trash")).find((t) => t.id === r.id) || {}).key;
      if (key) restore({ key, title: r.title });
    });
  }

  /* Put a deleted resume back (to the person shown when its own person was removed since). */
  async function restore(t) {
    const out = await api(`trash/${t.key}/restore`, { owner: S.person });
    S.lib = out;
    const doc = S.lib.resumes.find((r) => r.id === out.restored);
    if (doc && doc.owner !== S.person) { S.person = doc.owner; prefs.set("person", S.person); }
    if (!S.doc) renderLibrary();
    toast(`Restored “${t.title}”`, "Open", () => { location.hash = "#/r/" + out.restored; });
  }

  /* Deleted resumes: what each was, when it went, restore or delete for good (a second tap confirms). */
  async function trashDialog() {
    const list = el("ul.trash-list");
    const fill = (items) => {
      list.replaceChildren(...items.map((t) => {
        const forget = btn("Delete for good", "ghost small danger-text", async () => {
          if (!forget.classList.contains("sure")) {
            forget.classList.add("sure");
            forget.lastChild.textContent = "Tap again to delete";
            setTimeout(() => { forget.classList.remove("sure"); forget.lastChild.textContent = "Delete for good"; }, 3000);
            return;
          }
          S.lib = await api(`trash/${t.key}/delete`, {});
          row.remove();
          if (!S.doc) renderLibrary();
          if (!list.children.length) list.replaceWith(el("p.hint", { text: "Nothing deleted." }));
        });
        const tpl = tplDef(t.template);
        const row = el("li", {},
          el("div.trash-what", {}, el("b", { text: t.title }),
            el("span", { text: [t.name, tpl && tpl.name, plural(t.jobs, "role"), t.ownerName && t.owner !== S.person ? t.ownerName + "’s" : ""].filter(Boolean).join(" · ") }),
            el("small", { text: "Deleted " + ago(t.deleted) })),
          el("div.trash-do", {}, btn("Restore", "small", async () => { await restore(t); row.remove(); if (!list.children.length) $dlg.close(); }, "undo"), forget));
        return row;
      }));
    };
    const items = await api("trash");
    fill(items);
    dialog({ title: "Deleted resumes", text: items.length ? "Restore one to put it back in its person’s list." : "",
      body: items.length ? list : el("p.hint", { text: "Nothing deleted." }), cancelLabel: "Close" });
  }

  function personMenu(anchor, p) {
    if (RS.PUBLIC) return menu(anchor, [
      { label: S.lib.trash ? `Deleted resumes (${S.lib.trash})` : "Deleted resumes", icon: "trash", fn: trashDialog },
      RS.themeItem(),
      "-",
      { label: "Save a backup file", icon: "download", fn: async () => {
        const data = await RS.deviceBackup();
        const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" })),
          download: `7xresume-backup-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast(`Saved ${plural(data.resumes.length, "resume")}. Keep the file safe: it is your only copy outside this browser.`);
      } },
      { label: "Restore from a backup file", icon: "upload", fn: () => {
        const input = el("input", { type: "file", attrs: { accept: ".json,application/json" } });
        input.addEventListener("change", async () => {
          try {
            const n = await RS.deviceRestore(JSON.parse(await input.files[0].text()));
            await RS.refreshLibrary(); renderLibrary();
            toast(n ? `Restored ${plural(n, "resume")}` : "Nothing new in that file");
          } catch (err) { toast("Couldn’t restore: " + err.message); }
        });
        input.click();
      } },
    ]);
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
      "-",
      { label: S.lib.trash ? `Deleted resumes (${S.lib.trash})` : "Deleted resumes", icon: "trash", fn: trashDialog },
      RS.themeItem(),
      { label: "Download a backup (.zip)", icon: "download", fn: () => {
        el("a", { href: "api/backup", download: "" }).click();
        toast("Backup downloading: every person, resume and deleted resume");
      } },
    ]);
  }

  async function addPerson() {
    const name = await promptBox("Add a person", "Name", "", "Add");
    if (!name) return;
    S.lib = await api("people", { name });
    S.person = S.lib.people[S.lib.people.length - 1].id;
    prefs.set("person", S.person);
    renderLibrary();
  }

  async function duplicate(r) {
    const doc = await api("resumes", { owner: S.person, from: r.id });
    await RS.refreshLibrary();
    if (!S.doc) renderLibrary();
    toast(`Made “${doc.title}”`, "Open", () => { location.hash = "#/r/" + doc.id; });
  }

  /* What the importer found: a short list, and a reminder to check it (dates and titles can be misread). */
  function importReport(r, name) {
    const rows = (r.found || []).map(([k, v]) => el("li", {}, el("b", { text: k }), el("span", { text: v })));
    RS.dialog({ title: "Read from your " + (r.source || "file"), text: "“" + name + "” was read on this device; nothing was uploaded.",
      body: el("div.import-report", {}, el("ul.found", {}, rows),
        el("p.hint", { text: "Look over each part before you send it: dates, titles and lines that ran across two columns can be misread." })),
      okLabel: "Check it now", cancelLabel: false });
  }

  function importFile() {
    const input = el("input", { type: "file", attrs: { accept: ".pdf,.docx,.odt,.rtf,.txt,.md,.json,.html,.htm,application/pdf,application/json,text/html,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" } });
    input.addEventListener("change", async () => {
      const f = input.files[0];
      if (!f) return;
      try {
        const text = /\.(json|html?)$/i.test(f.name) ? await f.text() : "";
        let resume, design, report = null;
        if (/\.html?$/i.test(f.name) && text.includes("const JOBS")) {
          resume = (await api("import/editor", text, "text/html")).resume;
        } else if (!/\.json$/i.test(f.name)) {
          /* PDF, Word, OpenDocument, RTF, text, a web page: read on this device (js/import.js, pdf.js) */
          toast("Reading “" + f.name + "”…");
          const out = await window.Importer.read(f);
          resume = out.resume;
          design = out.design;
          report = out.report;
          if (!report || report.empty) throw new Error("no roles, education or skills found in it. Is it a scan or a photo?");
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
        if (report) importReport(report, f.name);
        else toast("Imported “" + f.name + "”");
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

  Object.assign(RS, {
    brand, thumbs, renderLibrary, card, cardMenu, personMenu, addPerson, duplicate, newResume, designDialog,
    importFile, importReport, exportJson, trashDialog,
  });
})();
