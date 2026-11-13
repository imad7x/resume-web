/* Minimal: lots of white space; section names sit in a narrow left column,
 * the content on the right, everything in shades of grey and one accent. */
Resume.template({
  id: "minimal",
  tags: ["simple"], ats: "high", example: "content",
  name: "Minimal",
  description: "Airy layout with section names in a left column; quiet and modern",
  width: 794,
  accent: "#0f766e",
  css: `
    .doc { font-family: "Raleway", "Lato", sans-serif; font-size: 12.5px; line-height: 1.6; color: #333; padding: 56px 60px 44px; }
    h1 { margin: 0; font-size: 34px; line-height: 1.1; font-weight: 300; color: #111; letter-spacing: .01em; }
    h1 b { font-weight: 700; }
    .label { margin-top: 8px; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
    .contact { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 11.5px; color: #555; }
    .sec { display: grid; grid-template-columns: 128px 1fr; gap: 24px; margin-top: 26px; }
    .sec > h2 { margin: 0; padding-top: 2px; font-size: 10.5px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #999; }
    .item + .item { margin-top: 15px; }
    .row { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; }
    .row b { font-size: 13.5px; color: #111; font-weight: 600; }
    .when { white-space: nowrap; font-size: 11px; color: #999; letter-spacing: .04em; }
    .org { color: var(--accent); font-weight: 500; }
    ul { margin: 6px 0 0; padding: 0; list-style: none; }
    li { position: relative; padding-left: 14px; margin-top: 3px; }
    li::before { content: ""; position: absolute; left: 0; top: .72em; width: 6px; height: 1px; background: #999; }
    p { margin: 0; }
    .skills div + div { margin-top: 3px; }
    .skills b { color: #111; font-weight: 600; }
    .muted { color: #888; }
  `,
  render(r, h) {
    const b = r.basics;
    const parts = b.name.split(/\s+/);
    const name = parts.length > 1 ? h.esc(parts.slice(0, -1).join(" ")) + " <b>" + h.esc(parts[parts.length - 1]) + "</b>" : `<b>${h.esc(b.name)}</b>`;
    const sec = (title, body) => (body ? `<div class="sec"><h2 class="head">${title}</h2><div>${body}</div></div>` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    return `
      <h1>${name}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => `<span>${h.link(c, c.text)}</span>`).join("")}</div>
      ${sec("About", b.summary && `<p>${h.md(b.summary)}</p>`)}
      ${sec("Experience", r.work.map((w) => `
        <div class="item">
          <div class="keep">
            <div class="row"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "short", sep: " — " })}</span></div>
            <div class="org">${h.esc([w.name, w.location].filter(Boolean).join(", "))}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${sec("Projects", r.projects.map((p) => `
        <div class="item">
          <div class="row keep"><b>${h.esc(p.name)}</b><span class="when">${p.url ? h.esc(p.url.replace(/^https?:\/\//, "")) : h.range(p, { fmt: "short", sep: " — " })}</span></div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${sec("Skills", r.skills.length && `<div class="skills">${r.skills.map((g) =>
        `<div class="keep"><b>${h.esc(g.name)}</b> <span class="muted">—</span> ${h.esc(g.keywords.join(", "))}</div>`).join("")}</div>`)}
      ${sec("Education", r.education.map((e) => `
        <div class="item keep">
          <div class="row"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b><span class="when">${h.range(e, { fmt: "year", sep: " — " })}</span></div>
          <div class="org">${h.esc(e.institution)}${e.score ? ` <span class="muted">· ${h.esc(e.score)}</span>` : ""}</div>
        </div>`).join(""))}
      ${sec("Certificates", r.certificates.map((c) => `
        <div class="item keep"><div class="row"><b>${h.esc(c.name)}</b><span class="when">${h.date(c.date, "short")}</span></div>
          ${c.issuer ? `<div class="muted">${h.esc(c.issuer)}</div>` : ""}</div>`).join(""))}
      ${sec("Languages", r.languages.length && `<p>${r.languages.map((l) =>
        h.esc(l.language) + (l.fluency ? ` <span class="muted">(${h.esc(l.fluency)})</span>` : "")).join(" &nbsp;·&nbsp; ")}</p>`)}`;
  },
});
