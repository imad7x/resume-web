/* Modern: name and headline on the left, contact details stacked on the
 * right, accent bars on the headings and skills as tags. Shows a photo. */
Resume.template({
  id: "modern",
  tags: ["photo", "simple"], ats: "medium", example: "designer",
  name: "Modern",
  description: "Clean header with contact on the right, accent bars, optional photo",
  width: 794,
  accent: "#2563eb",
  css: `
    .doc { font-family: "Inter", sans-serif; font-size: 12.5px; line-height: 1.55; color: #24292f; padding: 44px 50px 36px; }
    .top { display: flex; align-items: center; gap: 22px; padding-bottom: 20px; border-bottom: 2px solid #eef0f3; }
    .top .photo { width: 92px; height: 92px; border-radius: 50%; flex: none; border: 3px solid color-mix(in srgb, var(--accent) 25%, #fff); }
    .who { flex: 1; min-width: 0; }
    h1 { margin: 0; font-family: "Poppins", sans-serif; font-size: 32px; line-height: 1.1; font-weight: 600; color: #111827;
         letter-spacing: -.015em; }
    .label { margin-top: 6px; font-size: 14px; font-weight: 600; color: var(--accent); }
    .contact { flex: none; max-width: 270px; display: flex; flex-direction: column; gap: 5px; font-size: 11.5px; color: #4b5563; }
    .contact div { display: flex; gap: 8px; align-items: center; justify-content: flex-end; text-align: right; word-break: break-word; }
    .contact .ico { width: 12px; height: 12px; color: var(--accent); flex: none; order: 2; }
    h2 { margin: 24px 0 11px; font-family: "Poppins", sans-serif; font-size: 14px; font-weight: 600; color: #111827;
         display: flex; align-items: center; gap: 10px; }
    h2::before { content: ""; width: 4px; height: 16px; border-radius: 2px; background: var(--accent); }
    .summary { color: #374151; }
    .job + .job { margin-top: 15px; }
    .job-head { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; }
    .job-head b { font-size: 13.5px; color: #111827; }
    .when { white-space: nowrap; font-size: 11.5px; color: #6b7280; font-weight: 500; }
    .org { color: var(--accent); font-weight: 600; font-size: 12.5px; }
    .org span { color: #6b7280; font-weight: 400; }
    ul { margin: 6px 0 0; padding-left: 17px; }
    li { margin-top: 3px; padding-left: 2px; }
    li::marker { color: var(--accent); }
    p { margin: 0; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-row { display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: start; }
    .skill-row + .skill-row { margin-top: 8px; }
    .skill-row b { font-size: 12px; color: #374151; padding-top: 2px; }
    .tag { padding: 2px 9px; border-radius: 5px; background: color-mix(in srgb, var(--accent) 9%, #fff);
           color: color-mix(in srgb, var(--accent) 75%, #000); font-size: 11.5px; font-weight: 500; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 34px; }
    .item + .item { margin-top: 9px; }
    .muted { color: #6b7280; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const side = [
      section("Education", r.education.map((e) => `
        <div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b>
          <div class="muted">${h.esc(e.institution)}${e.score ? " · " + h.esc(e.score) : ""}</div>
          <div class="muted">${h.range(e, { fmt: "short" })}</div></div>`).join("")),
      section("Certifications", r.certificates.map((c) => `
        <div class="item keep"><b>${h.esc(c.name)}</b>${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "short")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join("")),
      section("Languages", r.languages.map((l) => `<div class="item"><b>${h.esc(l.language)}</b>${l.fluency ? ` <span class="muted">· ${h.esc(l.fluency)}</span>` : ""}</div>`).join("")),
    ].filter(Boolean);
    return `
      <div class="top">
        ${h.photo(b)}
        <div class="who"><h1>${h.esc(b.name)}</h1>${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}</div>
        <div class="contact">${h.contacts(b).map((c) => `<div>${h.icon(c.kind)}<span>${h.link(c, c.text)}</span></div>`).join("")}</div>
      </div>
      ${section("Profile", b.summary && `<p class="summary">${h.md(b.summary)}</p>`)}
      ${section("Experience", r.work.map((w) => `
        <div class="job">
          <div class="keep">
            <div class="job-head"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "short" })}</span></div>
            <div class="org">${h.esc(w.name)}${w.location ? ` <span>· ${h.esc(w.location)}</span>` : ""}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Projects", r.projects.map((p) => `
        <div class="job">
          <div class="keep">
            <div class="job-head"><b>${h.esc(p.name)}</b><span class="when">${h.range(p, { fmt: "short" })}</span></div>
            ${p.url ? `<div class="org"><span>${h.esc(p.url.replace(/^https?:\/\//, ""))}</span></div>` : ""}
          </div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${section("Skills", r.skills.map((g) => `
        <div class="skill-row keep"><b>${h.esc(g.name)}</b><div class="tags">${g.keywords.map((k) => `<span class="tag">${h.esc(k)}</span>`).join("")}</div></div>`).join(""))}
      ${side.length ? `<div class="cols">${side.map((s) => `<div>${s}</div>`).join("")}</div>` : ""}`;
  },
});
