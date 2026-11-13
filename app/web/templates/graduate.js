/* Graduate: for students and first jobs - education and projects come
 * before experience, skills sit up top where they are seen first. */
Resume.template({
  id: "graduate",
  tags: ["photo", "simple", "student"], ats: "high", example: "fresher",
  name: "Graduate",
  description: "Education, skills and projects first; made for students and freshers",
  width: 794,
  accent: "#0369a1",
  css: `
    .doc { font-family: "Lato", sans-serif; font-size: 12.5px; line-height: 1.55; color: #1f2933; padding: 42px 52px 36px; }
    .top { display: flex; align-items: center; gap: 20px; }
    .top .photo { width: 80px; height: 80px; border-radius: 50%; flex: none; }
    h1 { margin: 0; font-family: "Raleway", sans-serif; font-size: 31px; font-weight: 700; color: #0b1621; line-height: 1.15; }
    .label { font-size: 13.5px; color: var(--accent); font-weight: 700; margin-top: 3px; }
    .contact { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 3px 14px; font-size: 11.5px; color: #3e4c59; }
    .contact .ico { width: 11px; height: 11px; margin-right: 5px; color: var(--accent); }
    h2 { margin: 20px 0 9px; font-family: "Raleway", sans-serif; font-size: 13.5px; font-weight: 700; color: #fff;
         background: var(--accent); padding: 3px 12px; border-radius: 4px; letter-spacing: .04em; }
    .item + .item { margin-top: 11px; }
    .row { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; }
    .row b { font-size: 13px; color: #0b1621; }
    .when { white-space: nowrap; font-size: 11.5px; color: #616e7c; }
    .sub { color: #3e4c59; }
    .score { color: var(--accent); font-weight: 700; }
    ul { margin: 4px 0 0; padding-left: 17px; }
    li { margin-top: 2px; }
    p { margin: 0; }
    .skills { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 26px; }
    .skills b { color: #0b1621; }
    .muted { color: #616e7c; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    return `
      <div class="top">${h.photo(b)}
        <div><h1>${h.esc(b.name)}</h1>${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
          <div class="contact">${h.contacts(b).map((c) => `<span>${h.icon(c.kind)}${h.link(c, c.text)}</span>`).join("")}</div></div>
      </div>
      ${section("Objective", b.summary && `<p>${h.md(b.summary)}</p>`)}
      ${section("Education", r.education.map((e) => `
        <div class="item keep">
          <div class="row"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b><span class="when">${h.range(e, { fmt: "short" })}</span></div>
          <div class="sub">${h.esc(e.institution)}${e.score ? ` · <span class="score">${h.esc(e.score)}</span>` : ""}</div>
          ${e.courses.length ? `<div class="muted">Courses: ${h.esc(e.courses.join(", "))}</div>` : ""}
        </div>`).join(""))}
      ${section("Skills", r.skills.length && `<div class="skills">${r.skills.map((g) =>
        `<div class="keep"><b>${h.esc(g.name)}:</b> ${h.esc(g.keywords.join(", "))}</div>`).join("")}</div>`)}
      ${section("Projects", r.projects.map((p) => `
        <div class="item">
          <div class="row keep"><b>${h.esc(p.name)}</b><span class="when">${p.url ? h.esc(p.url.replace(/^https?:\/\//, "")) : h.range(p, { fmt: "short" })}</span></div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${section("Experience", r.work.map((w) => `
        <div class="item">
          <div class="keep">
            <div class="row"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "short" })}</span></div>
            <div class="sub">${h.esc([w.name, w.location].filter(Boolean).join(", "))}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Certifications & Awards", r.certificates.length && `<ul>${r.certificates.map((c) =>
        `<li>${h.esc(c.name)}${c.issuer ? ", " + h.esc(c.issuer) : ""}${c.date ? " (" + h.date(c.date, "short") + ")" : ""}</li>`).join("")}</ul>`)}
      ${section("Languages", r.languages.length && `<p>${r.languages.map((l) =>
        h.esc(l.language) + (l.fluency ? " (" + h.esc(l.fluency) + ")" : "")).join(", ")}</p>`)}`;
  },
});
