/* Creative: a tinted left column with a photo (or initials), contact and
 * skill tags; a large name and a dotted career line on the right. */
Resume.template({
  id: "creative",
  tags: ["photo", "creative"], ats: "low", example: "content",
  name: "Creative",
  description: "Tinted side column with photo or initials, dotted career line",
  width: 794,
  accent: "#db2777",
  css: `
    .doc { display: flex; font-family: "Montserrat", sans-serif; font-size: 11.5px; line-height: 1.6; color: #2e2a33; }
    .side { width: 33%; flex: none; padding: 40px 24px 30px; background: color-mix(in srgb, var(--accent) 8%, #fff); }
    .main { flex: 1; padding: 44px 38px 30px 34px; }
    .pic { width: 122px; height: 122px; margin: 0 auto 6px; border-radius: 50%; overflow: hidden; display: grid; place-items: center;
           background: var(--accent); color: #fff; font-size: 40px; font-weight: 700; letter-spacing: .02em; }
    .pic .photo { width: 100%; height: 100%; }
    h1 { margin: 0; font-size: 34px; line-height: 1.05; font-weight: 700; color: #18151c; letter-spacing: -.02em; }
    .label { margin-top: 10px; display: inline-block; padding: 4px 12px; border-radius: 999px; background: var(--accent); color: #fff;
             font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    .summary { margin-top: 16px; color: #4a4552; }
    h2 { margin: 28px 0 12px; font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
    .side h2 { margin-top: 26px; }
    .c { display: flex; gap: 9px; align-items: flex-start; margin-top: 8px; word-break: break-word; }
    .c .ico { width: 12px; height: 12px; margin-top: 3px; flex: none; color: var(--accent); }
    .grp + .grp { margin-top: 12px; }
    .grp b { display: block; font-size: 11px; color: #18151c; margin-bottom: 5px; }
    .tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .tag { padding: 1px 8px; border-radius: 999px; background: #fff; border: 1px solid color-mix(in srgb, var(--accent) 30%, #fff);
           font-size: 10.5px; }
    .side .item + .item { margin-top: 10px; }
    .side .item b { color: #18151c; }
    .muted { color: #7a7482; }
    .line { position: relative; padding-left: 20px; }
    .line::before { content: ""; position: absolute; left: 4px; top: 6px; bottom: 6px; border-left: 2px dotted
                    color-mix(in srgb, var(--accent) 45%, #fff); }
    .job { position: relative; }
    .job + .job { margin-top: 16px; }
    .job::before { content: ""; position: absolute; left: -20px; top: 4px; width: 10px; height: 10px; border-radius: 50%;
                   background: #fff; border: 2px solid var(--accent); }
    .job-head b { font-size: 13px; color: #18151c; }
    .meta { color: var(--accent); font-weight: 600; font-size: 11px; }
    .meta span { color: #7a7482; font-weight: 500; }
    ul { margin: 6px 0 0; padding-left: 15px; }
    li { margin-top: 2px; }
    li::marker { color: var(--accent); }
    p { margin: 0; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const job = (title, org, when, x) => `
      <div class="job">
        <div class="job-head keep"><b>${h.esc(title)}</b>
          <div class="meta">${org}${when ? ` <span>· ${when}</span>` : ""}</div></div>
        ${x.summary || x.description ? `<p>${h.md(x.summary || x.description)}</p>` : ""}
        ${bullets(x.highlights)}
      </div>`;
    return `
      <aside class="side">
        <div class="pic">${h.photo(b) || h.initials(b.name)}</div>
        ${section("Contact", h.contacts(b).map((c) => `<div class="c">${h.icon(c.kind)}<span>${h.link(c, c.text)}</span></div>`).join(""))}
        ${section("Skills", r.skills.map((g) => `
          <div class="grp keep"><b>${h.esc(g.name)}</b><div class="tags">${g.keywords.map((k) => `<span class="tag">${h.esc(k)}</span>`).join("")}</div></div>`).join(""))}
        ${section("Education", r.education.map((e) => `
          <div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b>
            <div>${h.esc(e.institution)}</div><div class="muted">${h.range(e, { fmt: "year" })}${e.score ? " · " + h.esc(e.score) : ""}</div></div>`).join(""))}
        ${section("Certifications", r.certificates.map((c) => `
          <div class="item keep"><b>${h.esc(c.name)}</b>${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "short")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join(""))}
        ${section("Languages", r.languages.map((l) => `<div class="item"><b>${h.esc(l.language)}</b>${l.fluency ? ` <span class="muted">${h.esc(l.fluency)}</span>` : ""}</div>`).join(""))}
      </aside>
      <main class="main">
        <h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        ${b.summary ? `<p class="summary">${h.md(b.summary)}</p>` : ""}
        ${section("Experience", r.work.length && `<div class="line">${r.work.map((w) =>
          job(w.position, h.esc([w.name, w.location].filter(Boolean).join(", ")), h.range(w, { fmt: "short" }), w)).join("")}</div>`)}
        ${section("Projects", r.projects.length && `<div class="line">${r.projects.map((p) =>
          job(p.name, h.esc(p.url.replace(/^https?:\/\//, "")), h.range(p, { fmt: "short" }), p)).join("")}</div>`)}
      </main>`;
  },
});
