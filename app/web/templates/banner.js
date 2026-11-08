/* Banner: a full-width colour band with name and contact, then experience
 * beside a narrow column of skill tags, education and certifications. */
Resume.template({
  id: "banner",
  name: "Banner",
  description: "Bold colour band on top, skill tags in a side column",
  width: 794,
  accent: "#0e7490",
  css: `
    .doc { font-family: "Inter", sans-serif; font-size: 12.5px; line-height: 1.5; color: #1e293b;
           display: flex; flex-direction: column; }
    .band { background: var(--accent); color: #fff; padding: 34px 44px 26px; }
    h1 { margin: 0; font-family: "Poppins", sans-serif; font-size: 32px; line-height: 1.1; font-weight: 600; }
    .label { margin-top: 6px; font-size: 14px; font-weight: 500; opacity: .9; letter-spacing: .02em; }
    .contact { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 12px; }
    .contact .ico { width: 12px; height: 12px; margin-right: 6px; opacity: .85; }
    .body { flex: 1; display: grid; grid-template-columns: 1fr 228px; }
    .main { padding: 24px 28px 28px 44px; }
    .side { padding: 24px 40px 28px 22px; border-left: 1px solid #e2e8f0; }
    h2 { margin: 22px 0 10px; font-family: "Poppins", sans-serif; font-size: 14px; font-weight: 600; color: var(--accent);
         text-transform: uppercase; letter-spacing: .08em; }
    .main > h2:first-child, .side > h2:first-child { margin-top: 0; }
    .job + .job { margin-top: 14px; }
    .job b { font-size: 13.5px; color: #0f172a; }
    .meta { display: flex; justify-content: space-between; gap: 12px; color: #475569; font-size: 12px; }
    .meta .org { font-weight: 600; color: #334155; }
    .when { white-space: nowrap; }
    ul { margin: 5px 0 0; padding-left: 16px; }
    li { margin-top: 2px; }
    li::marker { color: var(--accent); }
    .grp + .grp { margin-top: 10px; }
    .grp b { display: block; font-size: 11.5px; color: #0f172a; margin-bottom: 4px; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tag { padding: 1px 8px; border-radius: 4px; font-size: 11px;
           background: color-mix(in srgb, var(--accent) 11%, white); color: #164e63; }
    .item + .item { margin-top: 9px; }
    .muted { color: #64748b; font-size: 11.5px; }
    p { margin: 0; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    return `
      <div class="band">
        <h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        <div class="contact">${h.contacts(b).map((c) => `<span>${h.icon(c.kind)}${h.link(c, c.text)}</span>`).join("")}</div>
      </div>
      <div class="body">
        <div class="main">
          ${section("Profile", b.summary && `<p>${h.md(b.summary)}</p>`)}
          ${section("Experience", r.work.map((w) => `
            <div class="job">
              <div class="keep"><b>${h.esc(w.position)}</b>
                <div class="meta"><span class="org">${h.esc([w.name, w.location].filter(Boolean).join(" · "))}</span><span class="when">${h.range(w, { fmt: "short", sep: " – " })}</span></div>
              </div>
              ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
              ${bullets(w.highlights)}
            </div>`).join(""))}
          ${section("Projects", r.projects.map((p) => `
            <div class="job">
              <b class="keep">${h.esc(p.name)}</b>
              ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
              ${bullets(p.highlights)}
            </div>`).join(""))}
        </div>
        <div class="side">
          ${section("Skills", r.skills.map((g) => `
            <div class="grp keep"><b>${h.esc(g.name)}</b><div class="tags">${g.keywords.map((k) => `<span class="tag">${h.esc(k)}</span>`).join("")}</div></div>`).join(""))}
          ${section("Education", r.education.map((e) => `
            <div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b>
            <div>${h.esc(e.institution)}</div><div class="muted">${h.range(e, { fmt: "short" })}${e.score ? " · " + h.esc(e.score) : ""}</div></div>`).join(""))}
          ${section("Certifications", r.certificates.map((c) => `
            <div class="item keep">${h.esc(c.name)}${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "short")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join(""))}
          ${section("Languages", r.languages.map((l) => `<div class="item">${h.esc(l.language)}${l.fluency ? `<div class="muted">${h.esc(l.fluency)}</div>` : ""}</div>`).join(""))}
        </div>
      </div>`;
  },
});
