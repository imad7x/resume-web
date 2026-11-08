/* Plain: one column, no icons, no colour blocks, standard headings - the
 * layout applicant tracking systems read most reliably. */
Resume.template({
  id: "plain",
  name: "Plain",
  description: "One column, no frills; safest for job portals that parse resumes",
  width: 794,
  accent: "#1f2937",
  css: `
    .doc { font-family: "Inter", Arial, sans-serif; font-size: 12.5px; line-height: 1.5; color: #1f2937;
           padding: 46px 56px 40px; }
    h1 { margin: 0; font-size: 26px; line-height: 1.2; font-weight: 700; color: #111827; letter-spacing: -.01em; }
    .label { margin-top: 2px; font-size: 14px; color: var(--accent); font-weight: 500; }
    .contact { margin-top: 8px; color: #374151; }
    .contact span + span::before { content: "|"; margin: 0 8px; color: #9ca3af; }
    h2 { margin: 22px 0 8px; padding-bottom: 3px; border-bottom: 1px solid #d1d5db; font-size: 12.5px;
         font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); }
    .item + .item { margin-top: 12px; }
    .row { display: flex; justify-content: space-between; gap: 16px; }
    .row b { color: #111827; }
    .when { white-space: nowrap; color: #4b5563; }
    .sub { color: #374151; font-style: italic; }
    ul { margin: 4px 0 0; padding-left: 18px; }
    li { margin-top: 2px; }
    .skills div + div { margin-top: 2px; }
    p { margin: 0; }
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
            <div class="row"><b>${h.esc(w.position)}</b><span class="when">${h.range(w, { fmt: "short" })}</span></div>
            <div class="sub">${h.esc([w.name, w.location].filter(Boolean).join(", "))}</div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Projects", r.projects.map((p) => `
        <div class="item">
          <div class="row keep"><b>${h.esc(p.name)}</b><span class="when">${h.range(p, { fmt: "short" })}</span></div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${section("Skills", r.skills.length && `<div class="skills">${r.skills.map((g) =>
        `<div class="keep"><b>${h.esc(g.name)}:</b> ${h.esc(g.keywords.join(", "))}</div>`).join("")}</div>`)}
      ${section("Education", r.education.map((e) => `
        <div class="item keep">
          <div class="row"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b><span class="when">${h.range(e, { fmt: "short" })}</span></div>
          <div class="sub">${h.esc(e.institution)}${e.score ? " · " + h.esc(e.score) : ""}</div>
        </div>`).join(""))}
      ${section("Certifications", r.certificates.length && `<ul>${r.certificates.map((c) =>
        `<li>${h.esc(c.name)}${c.issuer ? ", " + h.esc(c.issuer) : ""}${c.date ? " (" + h.date(c.date, "short") + ")" : ""}</li>`).join("")}</ul>`)}
      ${section("Languages", r.languages.length && `<p>${r.languages.map((l) =>
        h.esc(l.language) + (l.fluency ? " (" + h.esc(l.fluency) + ")" : "")).join(", ")}</p>`)}`;
  },
});
