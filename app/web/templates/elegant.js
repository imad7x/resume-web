/* Elegant: a display serif name between fine rules, small spaced capitals
 * for headings, and a two-column close for education and skills. */
Resume.template({
  id: "elegant",
  tags: ["simple"], ats: "high", example: "creative",
  name: "Elegant",
  description: "Display serif name between fine rules; refined and formal",
  width: 794,
  accent: "#a16207",
  css: `
    .doc { font-family: "Lato", sans-serif; font-size: 12.5px; line-height: 1.6; color: #2d2a26; padding: 48px 56px 40px; }
    .top { text-align: center; padding: 6px 0 16px; border-bottom: 1px solid var(--accent); position: relative; }
    .top::after { content: ""; position: absolute; left: 0; right: 0; bottom: -4px; border-bottom: 1px solid
                  color-mix(in srgb, var(--accent) 40%, #fff); }
    h1 { margin: 0; font-family: "Playfair Display", Georgia, serif; font-size: 38px; line-height: 1.1; font-weight: 600; color: #1c1917; }
    .label { margin-top: 8px; font-size: 11.5px; letter-spacing: .3em; text-transform: uppercase; color: var(--accent); }
    .contact { margin-top: 12px; font-size: 11.5px; color: #57534e; }
    .contact span + span::before { content: "\\25C6"; font-size: 6px; vertical-align: 2px; margin: 0 10px; color: var(--accent); }
    h2 { margin: 26px 0 12px; text-align: center; font-family: "Playfair Display", Georgia, serif; font-size: 16px; font-weight: 600;
         color: #1c1917; display: flex; align-items: center; gap: 14px; }
    h2::before, h2::after { content: ""; flex: 1; height: 1px; background: color-mix(in srgb, var(--accent) 45%, #fff); }
    .summary { text-align: center; font-style: italic; color: #44403c; padding: 0 30px; }
    .item + .item { margin-top: 14px; }
    .row { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; }
    .row b { font-size: 13.5px; color: #1c1917; }
    .when { white-space: nowrap; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #78716c; }
    .org { font-family: "Playfair Display", Georgia, serif; font-style: italic; color: var(--accent); font-size: 13px; }
    ul { margin: 5px 0 0; padding-left: 16px; }
    li { margin-top: 2px; }
    li::marker { color: var(--accent); }
    p { margin: 0; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 36px; }
    .cols .item + .item { margin-top: 9px; }
    .grp b { display: block; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #1c1917; }
    .muted { color: #78716c; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const left = [
      section("Skills", r.skills.map((g) => `<div class="item grp keep"><b>${h.esc(g.name)}</b>${h.esc(g.keywords.join(", "))}</div>`).join("")),
      section("Languages", r.languages.map((l) => `<div class="item">${h.esc(l.language)}${l.fluency ? ` <span class="muted">· ${h.esc(l.fluency)}</span>` : ""}</div>`).join("")),
    ].filter(Boolean);
    const right = [
      section("Education", r.education.map((e) => `
        <div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b>
          <div class="org">${h.esc(e.institution)}</div><div class="muted">${h.range(e, { fmt: "year" })}${e.score ? " · " + h.esc(e.score) : ""}</div></div>`).join("")),
      section("Certifications", r.certificates.map((c) => `
        <div class="item keep"><b>${h.esc(c.name)}</b>${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "short")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join("")),
    ].filter(Boolean);
    return `
      <div class="top">
        <h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        <div class="contact">${h.contacts(b).map((c) => `<span>${h.link(c, c.text)}</span>`).join("")}</div>
      </div>
      ${section("Profile", b.summary && `<p class="summary">${h.md(b.summary)}</p>`)}
      ${section("Experience", r.work.map((w) => `
        <div class="item">
          <div class="keep">
            <div class="row"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "short" })}</span></div>
            <div class="org">${h.esc([w.name, w.location].filter(Boolean).join(", "))}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Projects", r.projects.map((p) => `
        <div class="item">
          <div class="row keep"><b>${h.esc(p.name)}</b><span class="when">${h.range(p, { fmt: "short" })}</span></div>
          ${p.url ? `<div class="org">${h.esc(p.url.replace(/^https?:\/\//, ""))}</div>` : ""}
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${left.length || right.length ? `<div class="cols"><div>${left.join("")}</div><div>${right.join("")}</div></div>` : ""}`;
  },
});
