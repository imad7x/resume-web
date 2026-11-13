/* Hybrid (combination): a strong skills block right under the summary, then
 * the full work history with every result. Reads in order in any applicant
 * tracker; for people with a clear speciality and a steady career. */
Resume.template({
  id: "hybrid", name: "Hybrid", order: 8,
  description: "Combination format: a skills grid under your summary, then your full work history",
  width: 794, accent: "#1d4ed8", fonts: { head: "IBM Plex Sans", body: "IBM Plex Sans" }, dateFmt: "short", joiner: " · ",
  tags: ["simple", "ats"], ats: "high", example: "marketing",
  slots: { main: ["summary", "skills", "work", "projects", "education", "certificates", "languages", "awards", "volunteer"] },
  own: ["contact"], titles: { summary: "Summary", skills: "Core skills", work: "Experience" },
  css: `
    .doc { font-size: 12.2px; line-height: 1.5; color: #1e293b; }
    .page { padding-inline: calc(54px * var(--pad)); }
    .top { display: grid; grid-template-columns: 1fr auto; gap: 6px 24px; align-items: end; }
    h1 { font-size: 30px; font-weight: 700; line-height: 1.05; color: #0f172a; letter-spacing: -.01em; }
    .label { grid-column: 1; font-size: 14px; font-weight: 600; color: var(--accent); }
    .contact { grid-column: 2; grid-row: 1 / span 2; text-align: right; font-size: 11.3px; line-height: 1.6; color: #475569; }
    .rule { height: 3px; margin-top: 12px; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 15%, #fff)); }
    h2 { font-size: 12.4px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #0f172a;
         margin-bottom: calc(8px * var(--sp)); }
    h2::after { content: ""; display: block; width: 28px; height: 2px; margin-top: 4px; background: var(--accent); }
    .sec, .sec:first-child { margin-top: calc(17px * var(--sp)); }
    .sec-skills .body { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(10px * var(--sp)) 18px;
                        padding: 12px 14px; border-radius: 6px; background: color-mix(in srgb, var(--accent) 6%, #fff);
                        border: 1px solid color-mix(in srgb, var(--accent) 18%, #fff); }
    .sec-skills .grp { margin: 0; }
    .sec-skills .grp b { display: block; font-size: 11.4px; letter-spacing: .04em; text-transform: uppercase; color: var(--accent); margin-bottom: 2px; }
    .sec-skills .tags { display: block; }
    .sec-skills .tags span { display: block; }
    /* one list of skills with no group names: spread it over the three columns */
    .sec-skills .body:has(> .grp:only-child) { display: block; }
    .sec-skills .grp:only-child .tags { columns: 3; column-gap: 18px; }
    .item { margin-top: calc(11px * var(--sp)); }
    .t { color: #0f172a; font-weight: 700; }
    .sub { font-weight: 600; color: #334155; }
    .when, .where { color: #64748b; }
  `,
  draw: {
    skills(r, h) { return `<div class="body">${h.skills(r.skills, "chips")}</div>`; },
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency.toLowerCase())})` : "")).join(", ")}</p>`; },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <div class="top"><h1>${h.esc(b.name)}</h1>
        <div class="contact">${h.contacts(b).map((c) => `<div>${h.link(c, c.text)}</div>`).join("")}</div>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}</div>
      <div class="rule"></div>
      ${slot.main}
    </div>`;
  },
});
