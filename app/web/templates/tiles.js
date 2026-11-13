/* Tiles: each section in a soft rounded panel; skills, education and the
 * rest side by side in two columns of tiles. Shows a photo. */
Resume.template({
  id: "tiles",
  tags: ["photo", "creative"], ats: "low", example: "designer",
  name: "Tiles",
  description: "Sections in soft rounded panels, two columns of tiles; friendly",
  width: 794,
  accent: "#4f46e5",
  css: `
    .doc { font-family: "Nunito Sans", sans-serif; font-size: 12px; line-height: 1.55; color: #2a2d3a; padding: 32px 34px 30px; }
    .top { display: flex; align-items: center; gap: 20px; padding: 24px 26px; border-radius: 16px; color: #fff;
           background: linear-gradient(120deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #0ea5e9)); }
    .top .photo { width: 86px; height: 86px; border-radius: 14px; flex: none; border: 3px solid rgba(255, 255, 255, .5); }
    h1 { margin: 0; font-family: "Poppins", sans-serif; font-size: 30px; line-height: 1.1; font-weight: 600; }
    .label { margin-top: 4px; font-size: 13.5px; opacity: .92; }
    .contact { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11px; }
    .contact .ico { width: 11px; height: 11px; margin-right: 5px; opacity: .9; }
    .tile { margin-top: 14px; padding: 16px 20px; border-radius: 14px; background: color-mix(in srgb, var(--accent) 4%, #f7f7fa); }
    h2 { margin: 0 0 10px; font-family: "Poppins", sans-serif; font-size: 13px; font-weight: 600; color: var(--accent);
         display: flex; align-items: center; gap: 8px; }
    h2::before { content: ""; width: 8px; height: 8px; border-radius: 3px; background: var(--accent); }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; align-items: start; }
    .job + .job { margin-top: 13px; padding-top: 13px; border-top: 1px dashed #dcdce8; }
    .row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .row b { font-size: 13px; color: #151826; }
    .when { white-space: nowrap; font-size: 10.5px; font-weight: 700; color: var(--accent);
            background: color-mix(in srgb, var(--accent) 9%, #fff); padding: 1px 8px; border-radius: 999px; }
    .org { color: #5b6075; font-weight: 600; }
    ul { margin: 5px 0 0; padding-left: 16px; }
    li { margin-top: 2px; }
    li::marker { color: var(--accent); }
    p { margin: 0; }
    .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
    .tag { padding: 1px 8px; border-radius: 6px; background: #fff; font-size: 11px; }
    .grp + .grp { margin-top: 9px; }
    .grp b { font-size: 11.5px; color: #151826; }
    .item + .item { margin-top: 8px; }
    .muted { color: #7a7f94; }
  `,
  render(r, h) {
    const b = r.basics;
    const tile = (title, body, cls) => (body ? `<div class="tile ${cls || ""}"><h2 class="head">${title}</h2>${body}</div>` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const left = [
      tile("Skills", r.skills.map((g) => `<div class="grp keep"><b>${h.esc(g.name)}</b><div class="tags">${g.keywords.map((k) => `<span class="tag">${h.esc(k)}</span>`).join("")}</div></div>`).join("")),
      tile("Languages", r.languages.map((l) => `<div class="item">${h.esc(l.language)}${l.fluency ? ` <span class="muted">· ${h.esc(l.fluency)}</span>` : ""}</div>`).join("")),
    ].filter(Boolean);
    const right = [
      tile("Education", r.education.map((e) => `<div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b>
        <div class="muted">${h.esc(e.institution)}${e.score ? " · " + h.esc(e.score) : ""} · ${h.range(e, { fmt: "year" })}</div></div>`).join("")),
      tile("Certifications", r.certificates.map((c) => `<div class="item keep"><b>${h.esc(c.name)}</b>${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "short")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join("")),
    ].filter(Boolean);
    return `
      <div class="top">
        ${h.photo(b)}
        <div><h1>${h.esc(b.name)}</h1>${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
          <div class="contact">${h.contacts(b).map((c) => `<span>${h.icon(c.kind)}${h.link(c, c.text)}</span>`).join("")}</div></div>
      </div>
      ${tile("About me", b.summary && `<p>${h.md(b.summary)}</p>`)}
      ${tile("Experience", r.work.map((w) => `
        <div class="job">
          <div class="keep">
            <div class="row"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "short" })}</span></div>
            <div class="org">${h.esc([w.name, w.location].filter(Boolean).join(" · "))}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${tile("Projects", r.projects.map((p) => `
        <div class="job">
          <div class="row keep"><b>${h.esc(p.name)}</b><span class="when">${h.range(p, { fmt: "short" })}</span></div>
          ${p.url ? `<div class="org">${h.esc(p.url.replace(/^https?:\/\//, ""))}</div>` : ""}
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${left.length || right.length ? `<div class="cols"><div>${left.join("")}</div><div>${right.join("")}</div></div>` : ""}`;
  },
});
