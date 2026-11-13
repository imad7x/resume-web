/* Executive: serif type, centred name, small-caps headings between rules. */
Resume.template({
  id: "executive",
  tags: ["simple"], ats: "high", example: "creative",
  name: "Executive",
  description: "Serif, centred heading, classic and formal",
  width: 794,
  accent: "#7f1d1d",
  css: `
    .doc { font-family: "Source Serif 4", Georgia, serif; font-size: 13px; line-height: 1.5; color: #222;
           padding: 50px 62px 40px; }
    header { text-align: center; }
    h1 { margin: 0; font-size: 32px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #111; }
    .label { margin-top: 4px; font-size: 14px; font-style: italic; color: var(--accent); }
    .contact { margin-top: 10px; font-size: 12px; color: #444; }
    .contact span + span::before { content: "\\00b7"; margin: 0 9px; color: var(--accent); }
    .rule { margin-top: 16px; border-top: 2px solid var(--accent); border-bottom: 1px solid var(--accent); height: 4px; }
    h2 { margin: 24px 0 10px; font-size: 14px; font-weight: 600; font-variant: small-caps; letter-spacing: .12em;
         color: var(--accent); display: flex; align-items: center; gap: 12px; }
    h2::before, h2::after { content: ""; flex: 1; height: 1px; background: #d6cfc7; }
    .summary { text-align: center; font-size: 13.5px; }
    .job + .job { margin-top: 14px; }
    .row { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; }
    .org { font-weight: 700; font-size: 14px; color: #111; }
    .when { white-space: nowrap; font-size: 12px; color: #555; font-style: italic; }
    .pos { font-style: italic; color: #333; }
    ul { margin: 5px 0 0; padding: 0; list-style: none; }
    li { position: relative; margin-top: 2px; padding-left: 16px; }
    li::before { content: "\\2013"; position: absolute; left: 2px; top: 0; color: var(--accent); font-size: 13px; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 28px; }
    .skill b { font-weight: 600; color: #111; }
    p { margin: 0; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    return `
      <header>
        <h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        <div class="contact">${h.contacts(b).map((c) => `<span>${h.link(c, c.text)}</span>`).join("")}</div>
        <div class="rule"></div>
      </header>
      ${section("Profile", b.summary && `<p class="summary">${h.md(b.summary)}</p>`)}
      ${section("Experience", r.work.map((w) => `
        <div class="job">
          <div class="keep">
            <div class="row"><span class="org">${h.esc(w.name)}</span><span class="when">${h.range(w)}</span></div>
            <div class="row"><span class="pos">${h.esc(w.position)}</span><span class="when">${h.esc(w.location)}</span></div>
          </div>
          ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
          ${bullets(w.highlights)}
        </div>`).join(""))}
      ${section("Projects", r.projects.map((p) => `
        <div class="job">
          <div class="row keep"><span class="org">${h.esc(p.name)}</span><span class="when">${h.range(p)}</span></div>
          ${p.description ? `<p>${h.md(p.description)}</p>` : ""}
          ${bullets(p.highlights)}
        </div>`).join(""))}
      ${section("Areas of Expertise", r.skills.length && `<div class="cols">${r.skills.map((g) =>
        `<div class="skill keep"><b>${h.esc(g.name)}</b> — ${h.esc(g.keywords.join(", "))}</div>`).join("")}</div>`)}
      ${section("Education", r.education.map((e) => `
        <div class="job keep">
          <div class="row"><span class="org">${h.esc(e.institution)}</span><span class="when">${h.range(e)}</span></div>
          <div class="pos">${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}${e.score ? " · " + h.esc(e.score) : ""}</div>
        </div>`).join(""))}
      ${section("Certifications", r.certificates.length && `<div class="cols">${r.certificates.map((c) =>
        `<div class="keep">${h.esc(c.name)}${c.issuer ? `, <i>${h.esc(c.issuer)}</i>` : ""}${c.date ? " (" + h.date(c.date, "year") + ")" : ""}</div>`).join("")}</div>`)}
      ${section("Languages", r.languages.length && `<p>${r.languages.map((l) =>
        h.esc(l.language) + (l.fluency ? " (" + h.esc(l.fluency) + ")" : "")).join(" · ")}</p>`)}`;
  },
});
