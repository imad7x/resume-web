/* Europass-style CV: the layout used across the EU. Headings in a left
 * column, content to the right, personal details and language levels. */
Resume.template({
  id: "europass", name: "Europass", order: 10,
  description: "European CV layout: headings on the left, personal details, photo optional",
  width: 794, accent: "#1d4f91", fonts: { head: "Nunito Sans", body: "Nunito Sans" }, dateFmt: "num", joiner: ", ",
  tags: ["simple", "photo"], ats: "medium", example: "creative",
  slots: { main: ["personal", "summary", "work", "education", "skills", "languages", "certificates", "projects", "awards", "references"] },
  own: ["contact"], titles: { summary: "About me", work: "Work experience", education: "Education and training", skills: "Skills" },
  css: `
    .doc { font-size: 12.2px; line-height: 1.5; color: #222b38; }
    .page { padding-inline: calc(46px * var(--pad)); }
    .top { display: flex; gap: 22px; align-items: center; padding-bottom: 14px; border-bottom: 2px solid var(--accent); }
    .top .photo { width: 92px; height: 112px; object-fit: cover; border-radius: 4px; flex: none; }
    h1 { font-size: 27px; font-weight: 800; color: var(--accent); line-height: 1.15; }
    .label { font-size: 13.5px; font-weight: 700; margin-top: 2px; }
    .contact { margin-top: 7px; display: flex; flex-wrap: wrap; gap: 3px 16px; font-size: 11.5px; }
    .contact .c { display: inline-flex; align-items: center; gap: 5px; }
    .contact .ico { width: 11px; height: 11px; color: var(--accent); }
    .sec { display: grid; grid-template-columns: 150px 1fr; gap: 0 22px; margin-top: calc(14px * var(--sp)); }
    .sec > * { grid-column: 2; }
    .sec > h2 { grid-column: 1; grid-row: 1 / span 40; text-align: right; font-size: 11.4px; font-weight: 800; letter-spacing: .05em;
                text-transform: uppercase; color: var(--accent); padding-top: 1px; }
    .item { margin-top: calc(9px * var(--sp)); }
    .item:first-of-type, .sec > .fact:first-of-type { margin-top: 0; }
    .item { position: relative; padding-left: 112px; }
    .item .when { position: absolute; left: 0; top: 0; width: 104px; color: #4a5566; }
    .row1, .row2 { justify-content: flex-start; gap: 10px; }
    .row2 .where:not(:empty)::before { content: "· "; }
    .t { font-weight: 800; }
    .fact { display: grid; grid-template-columns: 120px 1fr; gap: 10px; }
    .fact b { color: #4a5566; font-weight: 600; }
    .lang { display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: center; }
    .lang b { font-weight: 700; }
    .grp b { font-weight: 700; }
  `,
  draw: {
    languages(r, h) { return r.languages.map((l) => `<div class="lang keep"><b>${h.esc(l.language)}</b><span>${h.esc(l.fluency || "")}</span></div>`).join(""); },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <div class="top">${h.photo(b)}<div>
        <h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        <div class="contact">${h.contacts(b).map((c) => `<span class="c">${h.icon(c.kind)}${h.link(c, c.text)}</span>`).join("")}</div>
      </div></div>
      ${slot.main}
    </div>`;
  },
});
