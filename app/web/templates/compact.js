/* Compact: dense type and tight spacing, for a long career on fewer pages. */
Resume.template({
  id: "compact",
  tags: ["simple"], ats: "high", example: "engineer",
  name: "Compact",
  description: "Dense and tidy; fits a long career on fewer pages",
  width: 794,
  accent: "#0f766e",
  css: `
    .doc { font-family: "Inter", Arial, sans-serif; font-size: 11.5px; line-height: 1.45; color: #1f2937;
           padding: 34px 42px 30px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px;
             padding-bottom: 12px; border-bottom: 3px solid var(--accent); }
    h1 { margin: 0; font-size: 25px; line-height: 1.1; font-weight: 700; color: #0f172a; letter-spacing: -.02em; }
    .label { margin-top: 3px; font-size: 13px; font-weight: 600; color: var(--accent); }
    .contact { text-align: right; font-size: 11px; color: #374151; line-height: 1.6; }
    .contact .ico { width: 10px; height: 10px; margin-left: 6px; color: var(--accent); }
    h2 { margin: 14px 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
         color: var(--accent); }
    .job + .job { margin-top: 9px; }
    .line { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; }
    .line b { color: #0f172a; font-size: 12px; }
    .org { color: #374151; font-weight: 500; }
    .when { white-space: nowrap; color: #6b7280; font-size: 11px; font-variant-numeric: tabular-nums; }
    ul { margin: 3px 0 0; padding-left: 14px; }
    li { margin-top: 1px; }
    li::marker { color: var(--accent); }
    .skills { display: grid; grid-template-columns: 150px 1fr; gap: 3px 14px; }
    .skills b { color: #0f172a; font-weight: 600; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; }
    p { margin: 0; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const edu = section("Education", r.education.map((e) => `
      <div class="job keep"><div class="line"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b><span class="when">${h.range(e, { fmt: "num" })}</span></div>
      <div class="org">${h.esc(e.institution)}${e.score ? " · " + h.esc(e.score) : ""}</div></div>`).join(""));
    const certs = section("Certifications", r.certificates.map((c) => `
      <div class="job keep"><div class="line"><span>${h.esc(c.name)}</span><span class="when">${h.date(c.date, "num")}</span></div>
      ${c.issuer ? `<div class="org">${h.esc(c.issuer)}</div>` : ""}</div>`).join(""));
    const langs = section("Languages", r.languages.length && `<p>${r.languages.map((l) =>
      h.esc(l.language) + (l.fluency ? " (" + h.esc(l.fluency) + ")" : "")).join(", ")}</p>`);
    return `
      <header>
        <div><h1>${h.esc(b.name)}</h1>${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}</div>
        <div class="contact">${h.contacts(b).map((c) => `<div>${h.link(c, c.text)}${h.icon(c.kind)}</div>`).join("")}</div>
      </header>
      ${section("Summary", b.summary && `<p>${h.md(b.summary)}</p>`)}
      ${section("Skills", r.skills.length && `<div class="skills">${r.skills.map((g) =>
        `<b>${h.esc(g.name)}</b><span>${h.esc(g.keywords.join(", "))}</span>`).join("")}</div>`)}
      ${section("Experience", r.work.map((w) => `
        <div class="job">
          <div class="keep">
            <div class="line"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "num", sep: " – " })}</span></div>
            <div class="org">${h.esc([w.name, w.location].filter(Boolean).join(" · "))}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Projects", r.projects.map((p) => `
        <div class="job">
          <div class="line keep"><b>${h.esc(p.name)}</b><span class="when">${h.range(p, { fmt: "num", sep: " – " })}</span></div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      <div class="two"><div>${edu}${langs}</div><div>${certs}</div></div>`;
  },
});
