/* The form panels of the sections: profile, entries with points, rows, skills. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    S, DATA, NODE, icon, el, btn, iconBtn, grip, span, thisMonth, plural, autosize, autosizeAll,
    flip, pulse, vanish, toast, menu, sortable, changed, panelHead, field,
  } = RS;

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
      photoBox(b),
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
          hint: "A few lines about you. Wrap words in **double stars** to make them bold." })), summaryDrafts(b)),
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

  /* The photo: chosen from a file, cropped to a portrait and kept small inside the resume itself. */
  function photoBox(b) {
    const pic = el("div.photo-pic");
    const remove = btn("Remove", "small ghost", () => { b.image = ""; draw(); changed(); });
    const draw = () => {
      pic.replaceChildren(b.image ? el("img", { src: b.image, alt: "" }) : icon("user"));
      remove.hidden = !b.image;
    };
    draw();
    return el("div.box.box-pad.photo-box", {}, pic, el("div", {},
      el("b", { text: "Photo" }),
      el("p.hint", { text: "Optional. Designs marked “photo” show it, the others leave it out. Resumes for the US, UK and Canada usually go without one." }),
      el("div.photo-actions", {}, btn(b.image ? "Change photo" : "Choose photo", "small soft", () => pickPhoto((url) => { b.image = url; draw(); changed(); }), "image"), remove)));
  }
  function pickPhoto(done) {
    const input = el("input", { type: "file", attrs: { accept: "image/png,image/jpeg,image/webp" } });
    input.addEventListener("change", async () => {
      const f = input.files[0];
      if (!f) return;
      try {
        const bmp = await createImageBitmap(f);
        const W = 480, H = 600, scale = Math.max(W / bmp.width, H / bmp.height);
        const sw = W / scale, sh = H / scale;
        const c = el("canvas", { width: W, height: H });
        // centred across, a little above the middle down: faces sit high in a photo
        c.getContext("2d").drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) * 0.3, sw, sh, 0, 0, W, H);
        done(c.toDataURL("image/jpeg", 0.86));
      } catch (err) { toast("Couldn’t read that image"); }
    });
    input.click();
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

  LISTS.volunteer = {
    key: "volunteer", add: "Add role", noun: "role", points: "highlights", present: false, empty: "No volunteering yet.",
    blank: () => ({ position: "", organization: "", startDate: "", endDate: "", summary: "", highlights: [] }),
    head: (v) => [v.position || v.organization, [v.position ? v.organization : "", span(v)].filter(Boolean).join(" · "),
      v.highlights.filter((x) => x.trim()).length],
    placeholder: "New role",
    fields: (v) => [
      field("Role", v, "position", { placeholder: "e.g. Volunteer tutor" }),
      field("Organisation", v, "organization"),
      dates(v, false),
    ],
  };

  /* Start and end month; for jobs a "current role" switch stands for an empty end. */
  const lastEnd = new WeakMap();      // the end date the switch cleared
  function dates(item, present) {
    const start = el("input", { type: "month", value: item.startDate || "", attrs: { "data-k": "startDate" },
      on: { input: (e) => { item.startDate = e.target.value; changed(); } } });
    const end = el("input", { type: "month", value: item.endDate || "", hidden: present && !item.endDate, attrs: { "data-k": "endDate" },
      on: { input: (e) => { item.endDate = e.target.value; changed(); } } });
    const now = el("input", { value: "Present", disabled: true, hidden: !(present && !item.endDate) });
    const wrap = el("div.grid.wide.dates", {},
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

  // ---- phones: an entry opens as a full-screen sheet instead of folding open in the list
  const phone = matchMedia("(max-width: 900px)");
  let sheetNode = null;
  /* The phone's Back button closes the open sheet (the sheet pushed a history entry when it opened). */
  addEventListener("popstate", () => { if (sheetNode) sheetNode._open(false, false, true); });
  /* Crossing the phone width: entries open in the list fold shut (they would cover the screen without being a
   * sheet), and an open sheet closes when the screen gets wide again. */
  phone.addEventListener("change", () => {
    if (!phone.matches) return closeSheet();
    document.querySelectorAll(".entry.open").forEach((n) => { if (n !== sheetNode && n._open) n._open(false, true, true); });
  });
  /* Forget the sheet when its panel is redrawn or left (the node is gone with it). */
  function closeSheet() {
    if (!sheetNode) return;
    const n = sheetNode;
    sheetNode = null;
    document.body.classList.remove("sheet-open");
    if (n.isConnected) n._open(false, true, true);
    if (history.state && history.state.rsSheet) history.back();
  }

  function listPanel(cfg) {
    const list = cfg.list ? cfg.list() : S.doc.resume[cfg.key];
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
      box.prepend(node);
      empty.hidden = true;
      changed();
      if (phone.matches) { node._open(true); return; }   // straight into the sheet
      node.classList.add("entering", "flash");
      S.ui.pane.scrollTo({ top: 0, behavior: "smooth" });
      const input = node.querySelector(".entry-body input");
      if (input) input.focus({ preventScroll: true });
    }
    const addEnd = el("button.add-end", { type: "button", on: { click: () => addEntry() } }, icon("plus"), cfg.add);
    const headAdd = btn(cfg.add, "primary small head-add", () => addEntry(), "plus");   // phones use the one at the end
    return [panelHead(cfg.key, headAdd), box, empty, list.length ? addEnd : null];
  }

  function entryCard(ctx, item, isNew) {
    const { cfg, list, box, sync } = ctx;
    /* A new entry still as it was made (nothing typed): dropped when its sheet closes. */
    const pristine = isNew ? JSON.stringify(item) : null;
    const untouched = () => pristine !== null && JSON.stringify(item) === pristine;
    const titleB = el("b");
    const subS = el("small");
    const refreshHead = () => {
      const [t, s, pts] = cfg.head(item);
      titleB.textContent = t || cfg.placeholder;
      titleB.classList.toggle("placeholder", !t);
      subS.textContent = [s, pts ? plural(pts, "line") : ""].filter(Boolean).join(" · ") || " ";
    };
    refreshHead();
    const main = el("button.entry-main", { type: "button", attrs: { "aria-expanded": "false" } },
      el("div.entry-title", {}, titleB, subS), icon("chev", "chev"));
    const inner = el("div.sheet-scroll");
    const sheetTitle = el("b");
    const done = () => setOpen(false);
    const sheetBar = el("div.sheet-bar", {},
      iconBtn("x", "Close", done),
      sheetTitle,
      el("button.btn.small.soft", { type: "button", text: "Done", on: { click: done } }));
    const sheetFoot = el("div.sheet-foot", {},
      el("button.btn.ghost.danger-text", { type: "button", on: { click: () => { setOpen(false); remove(); } } }, icon("trash"), "Delete"),
      el("button.btn.primary", { type: "button", text: "Done", on: { click: done } }));
    const node = el("div.entry", {},
      el("div.entry-head", {}, grip(), main,
        el("div.tools", {},
          hideBtn(),
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
      el("div.fold", { attrs: { role: "dialog", "aria-label": "Edit " + cfg.noun } }, sheetBar, inner, sheetFoot));
    DATA.set(node, item);
    NODE.set(item, node);
    node.classList.toggle("off", !!item.hidden);

    /* Leave an entry off this copy's page without deleting it. */
    function hideBtn() {
      const b = iconBtn(item.hidden ? "eyeoff" : "eye", "Show or hide on the page", () => {
        if (item.hidden) delete item.hidden; else item.hidden = true;
        node.classList.toggle("off", !!item.hidden);
        b.replaceChildren(icon(item.hidden ? "eyeoff" : "eye"));
        changed();
        if (item.hidden) toast("Hidden on the page. It stays here, greyed out.");
      }, "sm");
      return b;
    }
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
    /* fromHistory: closing because of Back (or a redraw), so no history step to take back. */
    function setOpen(on, instant, fromHistory) {
      if (phone.matches && on && !node.classList.contains("open")) {
        if (sheetNode && sheetNode !== node) closeSheet();
        sheetNode = node;
        sheetTitle.textContent = (untouched() ? "New " : "Edit ") + cfg.noun;
        document.body.classList.add("sheet-open");
        history.pushState({ rsSheet: true }, "");
      } else if (!on && sheetNode === node) {
        sheetNode = null;
        document.body.classList.remove("sheet-open");
        if (!fromHistory && history.state && history.state.rsSheet) history.back();
        if (untouched() && list.includes(item)) { DATA.delete(node); list.splice(list.indexOf(item), 1); node.remove(); sync(); }
      }
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
    setOpen(!phone.matches && S.open.has(item), true);   // phones start with every sheet closed
    return node;
  }

  /* "What you did": the bullet lines of an entry. Enter starts the next line, Backspace at
   * the start of a line joins it to the one above, pasting several lines
   * makes several, Alt+Up/Down or the handle moves one. opts.head: the heading
   * (null for none, as in a custom list section, whose panel already has a title). */
  function pointsEditor(item, key, onChange, opts = {}) {
    const head = opts.head === undefined ? "What you did" : opts.head;
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
      if (text.trim()) toast("Line deleted", "Undo", () => {
        const n = row(text);
        box.insertBefore(n, box.children[i] || null);
        autosize(n.querySelector("textarea"));
        sync();
      });
    }
    function row(text) {
      const ta = el("textarea", { value: text, rows: 1, attrs: { placeholder: "What you did, and what came of it", "aria-label": "Line" } });
      const coach = el("div.coach", { hidden: true, attrs: { "aria-live": "polite" } });
      const node = el("div.point", {}, grip("Drag to reorder (or Alt+↑/↓)"), ta,
        iconBtn("x", "Delete line", () => remove(node), "danger sm"),
        iconBtn("more", "Move or delete this line", (e) => menu(e.currentTarget, [
          { label: "Move up", icon: "up", disabled: !node.previousElementSibling, fn: () => move(node, -1) },
          { label: "Move down", icon: "down", disabled: !node.nextElementSibling, fn: () => move(node, 1) },
          "-",
          { label: "Delete line", icon: "trash", danger: true, fn: () => remove(node) },
        ]), "sm line-more"), coach);
      /* The coach: one or two hints for this point while it has the focus (Smart.point, no network). */
      const hints = () => {
        coach.replaceChildren(...window.Smart.point(ta.value).map((h) =>
          el("span.hint-" + h.tone, {}, icon(h.tone === "ok" ? "check" : "spark"), h.text)));
        coach.hidden = false;
      };
      ta.addEventListener("focus", hints);
      ta.addEventListener("blur", () => { coach.hidden = true; });
      ta.addEventListener("input", () => { autosize(ta); sync(); hints(); });
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
          if (move(node, e.key === "ArrowUp" ? -1 : 1)) focusAt(node, s);
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
        toast(`Added ${plural(lines.length, "line")} from the pasted text`);
      });
      return node;
    }
    /* Move a line one place up (-1) or down (1). */
    function move(node, d) {
      const sib = d < 0 ? node.previousElementSibling : node.nextElementSibling;
      if (!sib) return false;
      flip([node, sib], () => (d < 0 ? sib.before(node) : sib.after(node)));
      sync();
      return true;
    }
    list.forEach((t) => box.append(row(t)));
    sortable(box, { item: ".point", handle: ".grip", drop: sync });
    /* Ideas: starting lines for this kind of job (data/phrases.js). A picked line keeps its [brackets] selected. */
    let ideas = null;
    function ideasBox() {
      const fams = window.PHRASES.families, Sm = window.Smart;
      const guess = Sm.familyOf(item.position || "") || Sm.familyOfResume(S.doc.resume);
      let key = guess ? guess.key : "general";
      const listBox = el("div.idea-list");
      const pick = el("select.idea-pick", { attrs: { "aria-label": "Kind of job" }, on: { change: () => { key = pick.value; fill(); } } },
        Object.entries(fams).map(([k, f]) => el("option", { value: k, text: f.name })), el("option", { value: "general", text: "Any job" }));
      pick.value = key;
      const use = (text) => {
        let last = box.lastElementChild;
        if (last && !last.querySelector("textarea").value.trim()) last.querySelector("textarea").value = text;
        else last = add(null, text);
        const ta = last.querySelector("textarea");
        autosize(ta);
        sync();
        const m = /\[[^\]]*\]/.exec(text);
        ta.focus();
        if (m) ta.setSelectionRange(m.index, m.index + m[0].length);
        fill();
      };
      function fill() {
        const used = new Set(list.map(String));
        const lines = (key === "general" ? window.PHRASES.general : fams[key].lines).filter((l) => !used.has(l));
        listBox.replaceChildren(...lines.map((l) => el("button.idea", { type: "button", on: { click: () => use(l) } }, icon("plus"), el("span", { text: l }))));
      }
      fill();
      return el("div.ideas", {}, el("div.ideas-head", {}, el("b", { text: "Lines to start from" }), pick),
        el("p.hint", { text: "Pick one, then put your own facts in place of the parts in [brackets]." }), listBox);
    }
    const ideasBtn = head === "What you did" ? btn("Ideas", "small ghost ideas-btn", (e) => {
      if (ideas) { ideas.remove(); ideas = null; e.currentTarget.classList.remove("on"); return; }
      ideas = ideasBox();
      e.currentTarget.classList.add("on");
      e.currentTarget.parentElement.after(ideas);
    }, "bulb", "Starting lines for this kind of job") : null;
    return el("div", {},
      el("div.points-head", {}, head ? el("b", { text: head }) : null,
        el("span.hint", {}, head ? "One line per result: start with a verb, add a number" : "One item per line",
          el("span.kbd-hint", {}, " · ", el("kbd", { text: "Enter" }), " adds a line"))),
      box,
      el("div.points-foot", {}, btn("Add a line", "small ghost add-row", () => {
        const last = box.lastElementChild;
        if (last && !last.querySelector("textarea").value.trim()) return focusAt(last);
        focusAt(add(null, ""));
        sync();
      }, "plus"), ideasBtn));
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

  Object.assign(ROWS, {
    awards: {
      key: "awards", add: "Add award", empty: "No awards yet.", blank: () => ({ title: "", awarder: "", date: "" }),
      cols: [
        { k: "title", label: "Award", flex: "1 1 100%", placeholder: "e.g. Employee of the year" },
        { k: "awarder", label: "Given by", flex: "1 1 0", placeholder: "Given by (optional)" },
        { k: "date", label: "Date", type: "month", flex: "0 0 160px" },
      ],
    },
    publications: {
      key: "publications", add: "Add publication", empty: "No publications yet.", blank: () => ({ name: "", summary: "", publisher: "", releaseDate: "" }),
      cols: [
        { k: "name", label: "Title", flex: "1 1 100%", placeholder: "Title" },
        { k: "summary", label: "Authors", flex: "1 1 100%", placeholder: "Authors, as they should be cited (optional)" },
        { k: "publisher", label: "Published in", flex: "1 1 0", placeholder: "Journal, conference or publisher" },
        { k: "releaseDate", label: "Year", flex: "0 0 110px", placeholder: "Year" },
      ],
    },
    references: {
      key: "references", add: "Add reference", empty: "No references yet.", blank: () => ({ name: "", position: "", phone: "", email: "" }),
      cols: [
        { k: "name", label: "Name", flex: "1 1 45%", placeholder: "Name" },
        { k: "position", label: "Role and company", flex: "1 1 45%", placeholder: "Role and company" },
        { k: "phone", label: "Phone", flex: "1 1 45%", placeholder: "Phone (optional)" },
        { k: "email", label: "Email", flex: "1 1 45%", placeholder: "Email (optional)" },
      ],
    },
    interests: {
      key: "interests", add: "Add interest", empty: "No interests yet.", atEnd: true, blank: () => ({ name: "" }),
      cols: [{ k: "name", label: "Interest", flex: "1 1 0", placeholder: "e.g. Photography" }],
    },
    personal: {
      key: "personal", list: () => S.doc.resume.basics.personal, add: "Add detail", empty: "No personal details yet.", atEnd: true,
      blank: () => ({ label: "", value: "" }),
      cols: [
        { k: "label", label: "Detail", flex: "0 0 190px", placeholder: "e.g. Date of birth", list: "personal-labels" },
        { k: "value", label: "Value", flex: "1 1 0", placeholder: "" },
      ],
    },
  });

  function rowsPanel(cfg) {
    const list = cfg.list ? cfg.list() : S.doc.resume[cfg.key];
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
      el("datalist#fluency", {}, ["Native", "Fluent", "Professional", "Conversational", "Basic"].map((n) => el("option", { value: n }))),
      el("datalist#personal-labels", {}, ["Date of birth", "Nationality", "Languages known", "Marital status", "Father’s name", "Address", "Passport", "Notice period"]
        .map((n) => el("option", { value: n })))];
  }

  // ---- skills
  /* Three summary drafts from the resume itself (Smart.summaries); picking one replaces the summary (Ctrl+Z undoes it). */
  function summaryDrafts(b) {
    const list = el("div.idea-list", { hidden: true });
    const open = btn("Draft it from my resume", "small ghost ideas-btn", (e) => {
      const on = list.hidden;
      e.currentTarget.classList.toggle("on", on);
      list.hidden = !on;
      if (!on) return;
      list.replaceChildren(el("p.hint", { text: "Built from your headline, roles and skills. Pick one, then fill in the [brackets]." }),
        ...window.Smart.summaries(S.doc.resume).map((t) => el("button.idea", { type: "button", on: { click: () => {
          b.summary = t;
          changed();
          RS.showSection("basics", true);
          const ta = S.ui.inner.querySelector('[data-k="summary"]'), m = /\[[^\]]*\]/.exec(t);
          if (ta) { ta.focus(); if (m) ta.setSelectionRange(m.index, m.index + m[0].length); }
          toast("Summary replaced", "Undo", () => RS.undo());
        } } }, icon("plus"), el("span", { text: t }))));
    }, "bulb", "Three drafts built from your resume");
    return el("div.summary-drafts", {}, open, list);
  }

  /* Skills often asked for in this kind of job that the resume doesn't list (data/phrases.js). */
  function skillIdeas() {
    const fams = window.PHRASES.families, fam = window.Smart.familyOfResume(S.doc.resume);
    if (!fam) return null;
    const ideas = window.Smart.skillIdeas(S.doc.resume, fam.key).slice(0, 12);
    if (!ideas.length) return null;
    return el("div.skill-ideas", {}, el("div.ideas-head", {}, el("b", { text: "Often asked for in " + fams[fam.key].name.toLowerCase() })),
      el("p.hint", { text: "Add only what you can talk about." }),
      el("div.mchips", {}, ideas.map((l) => el("button.mchip.miss.idea-chip", { type: "button", attrs: { title: "Add " + l },
        on: { click: () => RS.addSkill(l) } }, icon("plus"), l))));
  }

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
      el("button.add-group", { type: "button", on: { click: addGroup } }, icon("plus"), "Add skill group"), skillIdeas()].filter(Boolean);
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
      el("div.group-head", {}, grip("Drag to reorder groups"), name, count, levelPick(g),
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

  /* How strong a skill is, for designs that draw bars (a group without skills in it counts as one skill). */
  function levelPick(g) {
    const pick = el("select.level", { attrs: { "aria-label": "Level", title: "Level, drawn as a bar by some designs" } },
      [["", "No level"], ["2", "Basic"], ["3", "Good"], ["4", "Strong"], ["5", "Expert"]].map(([v, t]) => el("option", { value: v, text: t })));
    pick.value = String(Math.round(Resume.h.level(g.level)) || "");
    pick.addEventListener("change", () => { g.level = pick.value; changed(); });
    return pick;
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

  Object.assign(RS, {
    profilePanel, LISTS, lastEnd, dates, listPanel, entryCard, pointsEditor, ROWS, rowsPanel, closeSheet,
    skillsPanel, groupCard, syncChips, chip,
  });
})();
