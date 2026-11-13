/* Charcoal: the design of the original Resume_Editor.html, rule for rule.
 * Dark band with the name and headline centred, then a 70/30 split: profile, experience
 * and projects on the left; contact, skills, education and certifications in a
 * light grey column on the right. */
Resume.template({
  id: "charcoal",
  tags: ["columns"], ats: "medium", example: "engineer",
  name: "Charcoal",
  description: "Centred name on a dark band, contact, skills and education in a grey right column",
  order: 1,                   // first in the picker
  width: 794,                 // A4 width, so the text prints at its true 13px like the original did
  accent: "#2563eb",
  css: `
    .doc { font-family: "Nunito Sans", sans-serif; font-size: 13px; line-height: 17px; color: #050505;
           display: flex; flex-direction: column; }
    .doc ul { list-style: none; margin: 12px 0 0; padding: 0 0 0 14px; }
    .doc ul li { position: relative; padding: 0 0 4px 22px; }
    .doc ul li:last-child { padding-bottom: 0; }
    .doc ul li::before { content: "\\2022"; position: absolute; left: 0; top: 0; color: #333;
                         font-size: 16px; font-family: Arial, sans-serif; font-weight: 400; }
    .top { background: #333; padding: 26px 22px 25px; text-align: center; }
    .name { color: #fff; text-transform: uppercase; font-size: 30px; line-height: 40px; }
    .title { color: #fff; text-transform: uppercase; letter-spacing: .08em; position: relative; font-weight: bold;
             font-size: 15px; line-height: 20px; padding-top: 14px; margin-top: 6px; }
    .title::before { content: ""; position: absolute; height: 1px; background: #fff; top: 0; left: 0; right: 0;
                     margin: auto; width: 60px; }
    .body { display: flex; flex: 1; padding-left: 20px; }
    .left { width: 70.3%; padding: 27px 28px 27px 0; }
    /* #E3E2E2 at 20% over white, as a plain background so it continues on every page */
    .right { width: 29.7%; padding: 20px 20px 27px; background: rgba(227, 226, 226, .2); }
    .section { margin-top: 26px; }
    .section:first-child { margin-top: 0; }
    .heading { margin-bottom: 14px; }
    .sectiontitle { text-transform: uppercase; letter-spacing: .08em; font-weight: bold; color: #333;
                    font-size: 15px; line-height: 20px; border-bottom: 1px solid #d9d9d9; padding-bottom: 5px; }
    .paragraph { margin-top: 18px; }
    .paragraph:first-child, .heading + .paragraph { margin-top: 0; }
    .summary { line-height: 21px; }
    .detail { line-height: 19px; font-size: 13px; display: block; }
    .bold { font-weight: bold; }
    .block { display: block; }
    .company { color: var(--accent); }
    .sep { display: inline-block; opacity: .6; width: 9px; text-align: center; }
    .icon-row { display: table; table-layout: fixed; width: 100%; margin-bottom: 14px; }
    .icon-row:last-child { margin-bottom: 0; }
    .ico-cell { display: table-cell; width: 20px; height: 20px; vertical-align: top; line-height: normal; }
    .ico-cell .ico { width: 20px; height: 20px; margin-top: -1px; padding: 6px; border-radius: 50%;
                     background: #E3E2E2; color: #333; vertical-align: top; }
    .ico-txt { display: table-cell; vertical-align: top; padding-left: 12px; word-break: break-word; }
    .group { margin-top: 18px; }
    .group-title { color: var(--accent); font-weight: bold; text-transform: uppercase; letter-spacing: .04em;
                   font-size: 12px; }
    .group-items { line-height: 20px; margin-top: 4px; }
    .muted { color: #666; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body, cls) => body ? `
      <div class="section ${cls || ""}"><div class="heading head"><div class="sectiontitle">${title}</div></div>${body}</div>` : "";

    const jobs = r.work.map((w) => `
      <div class="paragraph">
        <div class="keep">
          <span class="detail bold">${h.esc(w.position)}</span>
          <span class="detail">${h.range(w)}${w.name ? `<span class="sep">│</span><span class="company">${h.esc(w.name)}${w.location ? ", " + h.esc(w.location) : ""}</span>` : ""}</span>
        </div>
        ${w.summary ? `<div class="detail">${h.md(w.summary)}</div>` : ""}
        ${w.highlights.length ? `<ul>${w.highlights.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : ""}
      </div>`).join("");

    const projects = r.projects.map((p) => `
      <div class="paragraph">
        <div class="keep">
          <span class="detail bold">${h.esc(p.name)}</span>
          <span class="detail">${h.range(p)}${p.url ? `${p.startDate ? `<span class="sep">│</span>` : ""}<span class="company">${h.link({ href: h.esc("https://" + p.url.replace(/^https?:\/\//, "")) }, h.esc(p.url.replace(/^https?:\/\//, "")))}</span>` : ""}</span>
        </div>
        ${p.description ? `<div class="detail">${h.md(p.description)}</div>` : ""}
        ${p.highlights.length ? `<ul>${p.highlights.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : ""}
      </div>`).join("");

    const education = r.education.map((e) => `
      <div class="group keep">
        <div class="group-title">${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</div>
        <div class="group-items">${h.esc(e.institution)}${e.score ? " · " + h.esc(e.score) : ""}${e.endDate ? `<div class="muted">${h.range(e, { fmt: "year" })}</div>` : ""}</div>
      </div>`).join("");

    const certs = r.certificates.map((c) => `
      <div class="group keep">
        <div class="group-title">${h.esc(c.name)}</div>
        ${c.issuer || c.date ? `<div class="group-items">${h.esc(c.issuer)}${c.issuer && c.date ? " · " : ""}${c.date ? h.date(c.date, "short") : ""}</div>` : ""}
      </div>`).join("");

    const contact = h.contacts(b).map((c) => `
      <div class="icon-row"><span class="ico-cell">${h.icon(c.kind)}</span><div class="ico-txt">${h.link(c, c.text)}</div></div>`).join("");

    const skills = r.skills.map((g) => `
      <div class="group keep">
        <div class="group-title">${h.esc(g.name)}</div>
        <div class="group-items">${g.keywords.map((k) => `<div>${h.esc(k)}</div>`).join("")}</div>
      </div>`).join("");

    const languages = r.languages.map((l) => `
      <div class="group keep"><div class="group-title">${h.esc(l.language)}</div>${l.fluency ? `<div class="group-items">${h.esc(l.fluency)}</div>` : ""}</div>`).join("");

    return `
      <div class="top">
        <div class="name">${h.esc(b.name)}</div>
        ${b.label ? `<div class="title">${h.esc(b.label)}</div>` : ""}
      </div>
      <div class="body">
        <div class="left">
          ${section("Profile", b.summary && `<div class="summary">${h.md(b.summary)}</div>`)}
          ${section("Experience", jobs)}
          ${section("Projects", projects)}
        </div>
        <div class="right">
          ${section("Contact", contact)}
          ${section("Skills", skills)}
          ${section("Education", education)}
          ${section("Certifications", certs)}
          ${section("Languages", languages)}
        </div>
      </div>`;
  },
});
