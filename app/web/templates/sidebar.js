/* Sidebar: a coloured left column with contact, skills, education and
 * certifications; name, profile and experience on the right. */
Resume.template({
  id: "sidebar",
  name: "Sidebar",
  description: "Coloured left column for contact and skills, roomy experience column",
  width: 794,
  accent: "#1e3a5f",
  css: `
    .doc { display: flex; font-family: "Lato", sans-serif; font-size: 12.5px; line-height: 1.55; color: #2b2f36; }
    .side { width: 34%; flex: none; background: var(--accent); color: #f1f5f9; padding: 40px 26px 30px; }
    .main { flex: 1; padding: 40px 36px 30px 34px; }
    h1 { margin: 0; font-family: "Poppins", sans-serif; font-size: 30px; line-height: 1.15; font-weight: 600;
         color: #111827; letter-spacing: -.01em; }
    .label { margin-top: 6px; font-family: "Poppins", sans-serif; font-size: 13px; font-weight: 500;
             letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
    .summary { margin-top: 18px; }
    h2 { margin: 28px 0 12px; font-family: "Poppins", sans-serif; font-size: 13px; font-weight: 600;
         letter-spacing: .14em; text-transform: uppercase; color: #111827; display: flex; align-items: center; gap: 10px; }
    h2::after { content: ""; flex: 1; height: 1px; background: #d7dbe0; }
    .side h2 { color: #fff; margin-top: 30px; }
    .side h2:first-child { margin-top: 0; }
    .side h2::after { background: rgba(255, 255, 255, .25); }
    .c { display: flex; gap: 10px; align-items: flex-start; margin-top: 9px; word-break: break-word; }
    .c .ico { width: 13px; height: 13px; margin-top: 3px; flex: none; opacity: .85; }
    .grp { margin-top: 12px; }
    .grp b { display: block; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: #fff; }
    .grp span { color: #d5dde8; }
    .tiny { color: #cbd5e1; font-size: 11.5px; }
    .side .item { margin-top: 10px; }
    .side .item b { color: #fff; }
    .job { margin-top: 16px; }
    h2 + .job { margin-top: 0; }
    .job-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .job-head b { font-size: 13.5px; color: #111827; }
    .when { white-space: nowrap; font-size: 11.5px; color: #6b7280; }
    .org { color: var(--accent); font-weight: 700; }
    ul { margin: 6px 0 0; padding-left: 16px; }
    li { margin-top: 3px; }
    li::marker { color: var(--accent); }
    p { margin: 0; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    return `
      <aside class="side">
        ${section("Contact", h.contacts(b).map((c) => `<div class="c">${h.icon(c.kind)}<span>${h.link(c, c.text)}</span></div>`).join(""))}
        ${section("Skills", r.skills.map((g) => `
          <div class="grp keep"><b>${h.esc(g.name)}</b><span>${h.esc(g.keywords.join(" · "))}</span></div>`).join(""))}
        ${section("Education", r.education.map((e) => `
          <div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b>
            <div>${h.esc(e.institution)}</div><div class="tiny">${h.range(e, { fmt: "short" })}${e.score ? " · " + h.esc(e.score) : ""}</div></div>`).join(""))}
        ${section("Certifications", r.certificates.map((c) => `
          <div class="item keep">${h.esc(c.name)}${c.issuer || c.date ? `<div class="tiny">${h.esc(c.issuer)}${c.issuer && c.date ? " · " : ""}${h.date(c.date, "short")}</div>` : ""}</div>`).join(""))}
        ${section("Languages", r.languages.map((l) => `
          <div class="item">${h.esc(l.language)}${l.fluency ? `<div class="tiny">${h.esc(l.fluency)}</div>` : ""}</div>`).join(""))}
      </aside>
      <main class="main">
        <h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        ${b.summary ? `<p class="summary">${h.md(b.summary)}</p>` : ""}
        ${section("Experience", r.work.map((w) => `
          <div class="job">
            <div class="keep">
              <div class="job-head"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "short" })}</span></div>
              <div class="org">${h.esc([w.name, w.location].filter(Boolean).join(" · "))}</div>
            </div>
            ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
            ${bullets(w.highlights)}
          </div>`).join(""))}
        ${section("Projects", r.projects.map((p) => `
          <div class="job">
            <div class="job-head keep"><b>${h.esc(p.name)}</b><span class="when">${h.range(p, { fmt: "short" })}</span></div>
            ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
            ${bullets(p.highlights)}
          </div>`).join(""))}
      </main>`;
  },
});
