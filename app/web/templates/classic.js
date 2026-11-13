/* Classic: the traditional one-page format career offices recommend - serif,
 * centred name, ruled small-caps headings, company and dates on one line. */
Resume.template({
  id: "classic",
  tags: ["simple"], ats: "high", example: "academic",
  name: "Classic",
  description: "Traditional serif layout with ruled headings; reads well in any applicant tracker",
  width: 794,
  accent: "#111111",
  css: `
    .thin { font-weight: 400; }
    .doc { font-family: "EB Garamond", "Source Serif 4", Georgia, serif; font-size: 14px; line-height: 1.4; color: #111;
           padding: 44px 58px 38px; }
    h1 { margin: 0; text-align: center; font-size: 30px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; }
    .label { text-align: center; margin-top: 2px; font-style: italic; font-size: 15px; color: #333; }
    .contact { margin-top: 6px; text-align: center; font-size: 13px; }
    .contact span + span::before { content: "\\2022"; margin: 0 9px; color: #777; }
    h2 { margin: 18px 0 7px; font-size: 14px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
         border-bottom: 1.2px solid var(--accent); padding-bottom: 1px; }
    .item + .item { margin-top: 9px; }
    .row { display: flex; justify-content: space-between; gap: 18px; }
    .row b { font-weight: 600; }
    .row i { color: #222; }
    .when { white-space: nowrap; }
    ul { margin: 2px 0 0; padding-left: 20px; }
    li { margin-top: 1px; }
    p { margin: 0; }
    .skills div + div { margin-top: 1px; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    return `
      <h1>${h.esc(b.name)}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => `<span>${h.link(c, c.text)}</span>`).join("")}</div>
      ${section("Summary", b.summary && `<p>${h.md(b.summary)}</p>`)}
      ${section("Experience", r.work.map((w) => `
        <div class="item">
          <div class="keep">
            <div class="row"><b>${h.esc(w.name || w.position)}</b><span>${h.esc(w.location)}</span></div>
            ${w.name ? `<div class="row"><i>${h.esc(w.position)}</i><span class="when">${h.range(w, { fmt: "short", sep: " – " })}</span></div>`
              : `<div class="row"><span></span><span class="when">${h.range(w, { fmt: "short", sep: " – " })}</span></div>`}
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Education", r.education.map((e) => `
        <div class="item keep">
          <div class="row"><b>${h.esc(e.institution)}</b><span>${h.esc(e.location)}</span></div>
          <div class="row"><i>${h.esc([e.studyType, e.area].filter(Boolean).join(" in "))}${e.score ? ", " + h.esc(e.score) : ""}</i>
            <span class="when">${h.range(e, { fmt: "short", sep: " – " })}</span></div>
        </div>`).join(""))}
      ${section("Projects", r.projects.map((p) => `
        <div class="item">
          <div class="row keep"><b>${h.esc(p.name)}${p.url ? ` <span class="thin">(${h.esc(p.url.replace(/^https?:\/\//, ""))})</span>` : ""}</b>
            <span class="when">${h.range(p, { fmt: "short", sep: " – " })}</span></div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${section("Skills", r.skills.length && `<div class="skills">${r.skills.map((g) =>
        `<div class="keep"><b>${h.esc(g.name)}:</b> ${h.esc(g.keywords.join(", "))}</div>`).join("")}</div>`)}
      ${section("Certifications", r.certificates.length && `<ul>${r.certificates.map((c) =>
        `<li>${h.esc(c.name)}${c.issuer ? ", " + h.esc(c.issuer) : ""}${c.date ? " (" + h.date(c.date, "short") + ")" : ""}</li>`).join("")}</ul>`)}
      ${section("Languages", r.languages.length && `<p>${r.languages.map((l) =>
        h.esc(l.language) + (l.fluency ? " (" + h.esc(l.fluency) + ")" : "")).join(", ")}</p>`)}`;
  },
});
