/* Job match in the editor: paste a job ad, see how well this version fits it and what to add.
 * The job is kept on the version (doc.target: role, company, url, jd). Smart.match does the reading. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const { S, el, btn, icon, calm } = RS;

  const tone = (n) => (n >= 75 ? "good" : n >= 50 ? "fair" : "low");
  const verdict = (n) => (n >= 75 ? "Close match" : n >= 50 ? "Partial match" : "Far from this job");
  const result = () => window.Smart.match(S.doc.resume, S.doc.target);

  function go(at) {
    if (!at || !at.section) return;
    const list = S.doc.resume[at.section];
    RS.jumpTo({ section: at.section, item: Array.isArray(list) && at.i != null ? list[at.i] : undefined, field: at.field, index: at.index });
  }

  /* Add a suggested skill: into a group called Key skills (or Skills, Other skills), else a new Key skills group at the
   * end. Never into some other group: in many designs a group is itself one rated skill ("Figma ●●●●○"). */
  function addSkill(label) {
    const groups = S.doc.resume.skills = S.doc.resume.skills || [];
    let g = groups.find((x) => /^(?:key |core |other |technical )?skills$/i.test(String(x.name || "").trim()));
    if (!g) { g = { name: "Key skills", keywords: [] }; groups.push(g); }
    g.keywords = g.keywords || [];
    if (!g.keywords.some((k) => String(k).toLowerCase() === label.toLowerCase())) g.keywords.push(label);
    RS.changed();
    if (S.section === "skills") RS.showSection("skills", true);
  }

  function input(label, key, opts) {
    const o = opts || {};
    const t = S.doc.target || {};
    const node = o.multiline
      ? el("textarea", { value: t[key] || "", attrs: { rows: 7, placeholder: o.placeholder, "data-k": "target-" + key, maxlength: 20000 } })
      : el("input", { value: t[key] || "", attrs: { placeholder: o.placeholder, autocomplete: "off", maxlength: 120, "data-k": "target-" + key } });
    node.addEventListener("input", () => {
      S.doc.target = Object.assign(S.doc.target || {}, { [key]: node.value });
      if (o.multiline) RS.autosize(node);
      RS.changed({ noPreview: true });
      redraw();
    });
    return el("label.field" + (o.wide ? ".wide" : ""), {}, el("span", { text: label }), node);
  }

  let timer = 0, out = null;
  function redraw() { clearTimeout(timer); timer = setTimeout(() => draw(false), 300); }

  function chip(label, have, add) {
    return el("span.mchip." + (have ? "have" : "miss"), {}, icon(have ? "check" : "x"), label,
      add ? el("button.mchip-add", { type: "button", attrs: { title: "Add “" + label + "” to your skills", "aria-label": "Add " + label + " to your skills" },
        on: { click: (e) => { e.currentTarget.parentElement.classList.add("added"); addSkill(label); redraw(); } } }, icon("plus")) : null);
  }

  function draw(animate) {
    if (!out) return;
    const m = result();
    if (!m) {
      out.replaceChildren(el("div.match-empty", {}, icon("target"),
        el("p", { text: "Paste the job ad above: the whole text, from the title to the requirements." }),
        el("p.hint", { text: "You'll see the skills it asks for that this resume doesn't show, and the lines that fit it best. Read on this device; nothing is sent anywhere." })));
      return;
    }
    const num = el("b", { text: animate ? "0" : m.score + "%" });
    const dial = el("div.dial.small." + tone(m.score), {}, num, el("span", { text: "match" }));
    dial.style.setProperty("--p", animate ? 0 : m.score);
    const t = S.doc.target || {};
    const missing = m.skills.missing.length + m.words.missing.length;
    out.replaceChildren(...[
      el("div.score-top", {}, dial, el("div", {},
        el("h3", { text: verdict(m.score) }),
        el("p", { text: [t.role, t.company].filter(Boolean).join(" at ") || (m.role ? m.role.label : "This job") }),
        el("p.hint", { text: missing ? `${missing} thing${missing === 1 ? "" : "s"} the ad asks for that this resume doesn't show.` : "This resume shows everything the ad asks for." }))),
      m.skills.have.length + m.skills.missing.length ? el("section", {},
        el("h3", { text: "Skills the ad asks for" }),
        el("div.mchips", {}, m.skills.missing.map((l) => chip(l, false, true)), m.skills.have.map((l) => chip(l, true))),
        m.skills.missing.length ? el("p.hint", { text: "Only add what you can talk about. Then mention it in a line under a role where you used it." }) : null) : null,
      m.words.have.length + m.words.missing.length ? el("section", {},
        el("h3", { text: "Words the ad repeats" }),
        el("div.mchips", {}, m.words.missing.map((l) => chip(l, false)), m.words.have.map((l) => chip(l, true)))) : null,
      m.checks.length ? el("section", {}, el("h3", { text: "Requirements" }),
        el("ul.todo", {}, m.checks.map((c) => el("li" + (c.ok ? ".ok" : ""), {}, icon(c.ok ? "check" : "x", "mark"),
          el("div", {}, el("b", { text: c.text }), c.why ? el("small", { text: c.why }) : null),
          c.ok ? null : btn("Show", "small", () => go(c.at)))))) : null,
      m.lines.length ? el("section", {}, el("h3", { text: "Your lines that fit this job" }),
        el("ul.todo", {}, m.lines.map((l) => el("li", {},
          el("div", {}, el("b", { text: l.text.length > 110 ? l.text.slice(0, 108) + "…" : l.text }), el("small", { text: l.hits.join(" · ") })),
          btn("Show", "small", () => go(l.at))))),
        el("p.hint", { text: "Put these first under their role so they are read first." })) : null,
      m.quiet.length ? el("section", {}, el("h3", { text: "Roles that say nothing about this job" }),
        el("ul.todo", {}, m.quiet.slice(0, 4).map((q) => el("li", {},
          el("div", {}, el("b", { text: q.name }), el("small", { text: "Add a line about work there that used what the ad asks for, or keep it short." })),
          btn("Show", "small", () => go(q.at)))))) : null,
      el("p.hint", { text: "Read on this device by rules, not AI. A match helps you get past the first screen; it isn't a promise." }),
    ].filter(Boolean));
    if (!animate) return;
    const t0 = performance.now(), spanMs = calm.matches ? 1 : 700;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / spanMs), v = Math.round(m.score * (1 - Math.pow(1 - k, 3)));
      num.textContent = v + "%";
      dial.style.setProperty("--p", v);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function openMatch() {
    out = el("div.match-out");
    const clear = btn("Clear job", "small ghost", () => {
      delete S.doc.target;
      RS.changed({ noPreview: true });
      RS.closeDrawer();
      openMatch();
    }, "trash");
    const body = el("div.drawer-body.score-body.match-body", {},
      el("div.grid.match-form", {},
        input("Job title", "role", { placeholder: "e.g. Data Engineer" }),
        input("Company", "company", { placeholder: "Optional" }),
        input("Job ad", "jd", { multiline: true, wide: true, placeholder: "Paste the whole job ad here" })),
      S.doc.target ? el("div.match-clear", {}, clear) : null,
      out);
    const node = RS.openDrawer("match", "Job match", body, "page", () => draw(false));
    if (!node) return;
    S.drawer.draw = draw;
    requestAnimationFrame(() => RS.autosizeAll && RS.autosizeAll(body));
    draw(true);
  }

  /* The one-line summary the resume check shows at its top. */
  function matchLine() {
    const m = S.doc && result();
    return m ? { score: m.score, role: (S.doc.target || {}).role || (m.role && m.role.label) || "this job" } : null;
  }

  Object.assign(RS, { openMatch, matchLine, addSkill });
})();
