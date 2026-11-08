/* Engineer: clean sans with monospace details - dates, labels and the
 * skills table - for technical roles. */
Resume.template({
  id: "engineer",
  name: "Engineer",
  description: "Monospace accents and a skills table; suits technical roles",
  width: 794,
  accent: "#047857",
  css: `
    .doc { font-family: "IBM Plex Sans", sans-serif; font-size: 12.5px; line-height: 1.5; color: #1c2128;
           padding: 40px 48px 32px; }
    .mono { font-family: "JetBrains Mono", monospace; }
    h1 { margin: 0; font-size: 29px; line-height: 1.15; font-weight: 700; color: #0d1117; letter-spacing: -.01em; }
    .label { margin-top: 4px; font-family: "JetBrains Mono", monospace; font-size: 13px; color: var(--accent); }
    .contact { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px 16px; font-family: "JetBrains Mono", monospace;
               font-size: 11px; color: #424a53; }
    .contact .ico { width: 11px; height: 11px; margin-right: 5px; color: var(--accent); }
    h2 { margin: 22px 0 10px; font-family: "JetBrains Mono", monospace; font-size: 12px; font-weight: 600;
         text-transform: uppercase; letter-spacing: .08em; color: #0d1117; display: flex; align-items: center; gap: 8px; }
    h2::before { content: ""; width: 8px; height: 8px; background: var(--accent); }
    h2::after { content: ""; flex: 1; border-top: 1px dashed #c9d1d9; }
    .job + .job { margin-top: 13px; }
    .row { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; }
    .row b { font-size: 13.5px; color: #0d1117; }
    .when { white-space: nowrap; font-family: "JetBrains Mono", monospace; font-size: 11px; color: #57606a; }
    .org { color: var(--accent); font-weight: 500; }
    ul { margin: 5px 0 0; padding: 0; list-style: none; }
    li { position: relative; margin-top: 2px; padding-left: 16px; }
    li::before { content: "\\25B8"; position: absolute; left: 2px; top: 2px; color: var(--accent); font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 0; vertical-align: top; border-bottom: 1px solid #eaeef2; }
    tr:last-child td { border-bottom: 0; }
    td:first-child { width: 175px; padding-right: 14px; font-family: "JetBrains Mono", monospace; font-size: 11px;
                     color: var(--accent); text-transform: lowercase; padding-top: 5px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 30px; }
    .item + .item { margin-top: 7px; }
    .muted { color: #57606a; }
    p { margin: 0; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const range = (x) => h.range(x, { fmt: "num", sep: " → ", present: "now" });
    const bottom = [
      section("Education", r.education.map((e) => `
        <div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b> <span class="when">${range(e)}</span>
        <div class="muted">${h.esc(e.institution)}${e.score ? " · " + h.esc(e.score) : ""}</div></div>`).join("")),
      section("Certifications", r.certificates.map((c) => `
        <div class="item keep">${h.esc(c.name)}${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "num")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join("")),
      section("Languages", r.languages.map((l) => `<div class="item">${h.esc(l.language)}${l.fluency ? ` <span class="muted">· ${h.esc(l.fluency)}</span>` : ""}</div>`).join("")),
    ].filter(Boolean);
    return `
      <h1>${h.esc(b.name)}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => `<span>${h.icon(c.kind)}${h.link(c, c.text)}</span>`).join("")}</div>
      ${section("About", b.summary && `<p>${h.md(b.summary)}</p>`)}
      ${section("Stack", r.skills.length && `<table>${r.skills.map((g) =>
        `<tr class="keep"><td>${h.esc(g.name)}</td><td>${h.esc(g.keywords.join(", "))}</td></tr>`).join("")}</table>`)}
      ${section("Experience", r.work.map((w) => `
        <div class="job">
          <div class="keep">
            <div class="row"><b>${h.esc(w.position)}</b><span class="when">${range(w)}</span></div>
            <div class="org">${h.esc([w.name, w.location].filter(Boolean).join(" · "))}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Projects", r.projects.map((p) => `
        <div class="job">
          <div class="row keep"><b>${h.esc(p.name)}</b><span class="when">${p.url ? h.esc(p.url.replace(/^https?:\/\//, "")) : range(p)}</span></div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${bottom.length ? `<div class="two">${bottom.map((s) => `<div>${s}</div>`).join("")}</div>` : ""}`;
  },
});
