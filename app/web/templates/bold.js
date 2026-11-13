/* Bold: a big two-weight name beside an accent block, dates in their own
 * column and strong uppercase headings. */
Resume.template({
  id: "bold",
  tags: ["creative"], ats: "medium", example: "creative",
  name: "Bold",
  description: "Big two-weight name, accent block and a date column; confident",
  width: 794,
  accent: "#ea580c",
  css: `
    .doc { font-family: "Montserrat", sans-serif; font-size: 11.5px; line-height: 1.6; color: #27272a; padding: 0 0 34px; }
    .top { display: flex; align-items: stretch; }
    .block { width: 26px; flex: none; background: var(--accent); }
    .who { flex: 1; padding: 40px 46px 22px 28px; }
    h1 { margin: 0; font-size: 40px; line-height: 1; text-transform: uppercase; letter-spacing: -.01em; color: #09090b; }
    h1 .f { font-weight: 400; display: block; }
    h1 .l { font-weight: 800; display: block; }
    .label { margin-top: 12px; font-size: 13px; font-weight: 600; color: var(--accent); letter-spacing: .04em; }
    .contact { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 11px; color: #52525b; }
    .contact .ico { width: 11px; height: 11px; margin-right: 5px; color: #09090b; }
    .body { padding: 0 46px 0 54px; }
    h2 { margin: 24px 0 12px; font-size: 13px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #09090b;
         border-bottom: 3px solid #09090b; padding-bottom: 4px; display: inline-block; }
    .summary { font-size: 12px; color: #3f3f46; }
    .ent { display: grid; grid-template-columns: 112px 1fr; gap: 18px; }
    .ent + .ent { margin-top: 14px; }
    .when { font-size: 10.5px; font-weight: 600; color: #71717a; padding-top: 2px; line-height: 1.5; }
    .ent b { font-size: 12.5px; color: #09090b; }
    .org { color: var(--accent); font-weight: 600; }
    ul { margin: 5px 0 0; padding: 0; list-style: none; }
    li { position: relative; margin-top: 2px; padding-left: 14px; }
    li::before { content: ""; position: absolute; left: 0; top: .62em; width: 5px; height: 5px; background: var(--accent); }
    p { margin: 0; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 34px; }
    .grp + .grp { margin-top: 8px; }
    .grp b { color: #09090b; }
    .muted { color: #71717a; }
  `,
  render(r, h) {
    const b = r.basics;
    const parts = b.name.split(/\s+/).filter(Boolean);
    const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : "", last = parts.length ? parts[parts.length - 1] : "";
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const ent = (when, head, x) => `
      <div class="ent"><div class="when">${when}</div>
        <div><div class="keep">${head}</div>${x.summary || x.description ? `<p>${h.md(x.summary || x.description)}</p>` : ""}${bullets(x.highlights || [])}</div></div>`;
    const lower = [
      section("Skills", r.skills.map((g) => `<div class="grp keep"><b>${h.esc(g.name)}:</b> ${h.esc(g.keywords.join(", "))}</div>`).join("")),
      section("Certifications", r.certificates.map((c) => `<div class="grp keep"><b>${h.esc(c.name)}</b>${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "short")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join("")),
      section("Languages", r.languages.map((l) => `<div class="grp"><b>${h.esc(l.language)}</b>${l.fluency ? ` <span class="muted">· ${h.esc(l.fluency)}</span>` : ""}</div>`).join("")),
    ].filter(Boolean);
    return `
      <div class="top"><div class="block"></div>
        <div class="who">
          <h1>${first ? `<span class="f">${h.esc(first)}</span>` : ""}<span class="l">${h.esc(last)}</span></h1>
          ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
          <div class="contact">${h.contacts(b).map((c) => `<span>${h.icon(c.kind)}${h.link(c, c.text)}</span>`).join("")}</div>
        </div>
      </div>
      <div class="body">
        ${section("Profile", b.summary && `<p class="summary">${h.md(b.summary)}</p>`)}
        ${section("Experience", r.work.map((w) => ent(h.range(w, { fmt: "short" }),
          `<b>${h.esc(w.position)}</b><div class="org">${h.esc([w.name, w.location].filter(Boolean).join(" · "))}</div>`, w)).join(""))}
        ${section("Projects", r.projects.map((p) => ent(h.range(p, { fmt: "short" }),
          `<b>${h.esc(p.name)}</b>${p.url ? `<div class="org">${h.esc(p.url.replace(/^https?:\/\//, ""))}</div>` : ""}`, p)).join(""))}
        ${section("Education", r.education.map((e) => ent(h.range(e, { fmt: "year" }),
          `<b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b><div class="org">${h.esc(e.institution)}${e.score ? ` <span class="muted">· ${h.esc(e.score)}</span>` : ""}</div>`, {})).join(""))}
        ${lower.length ? `<div class="cols">${lower.map((s) => `<div>${s}</div>`).join("")}</div>` : ""}
      </div>`;
  },
});
