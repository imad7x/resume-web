/* ATS: one plain column that every applicant tracking system reads in
 * order. No columns, no icons, no photo; standard headings. */
Resume.template({
  id: "ats", name: "ATS plain", order: 6,
  description: "One plain column with standard headings, built for online application systems",
  width: 794, accent: "#111827", fonts: { head: "Inter", body: "Inter" }, dateFmt: "short", joiner: ", ",
  tags: ["simple", "ats"], ats: "high", example: "engineer",
  slots: { main: ["summary", "work", "education", "skills", "projects", "certificates"] },
  own: ["contact"], titles: { summary: "Summary" },
  css: `
    .doc { font-size: 11.6px; line-height: 1.5; color: #1f2937; }
    .page { padding-inline: calc(56px * var(--pad)); }
    h1 { font-size: 25px; font-weight: 700; text-align: center; color: var(--accent); letter-spacing: .01em; }
    .label { text-align: center; font-size: 12.5px; margin-top: 2px; }
    .contact { text-align: center; margin-top: 6px; color: #374151; }
    h2 { font-size: 11.8px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent);
         border-bottom: 1px solid #374151; padding-bottom: 3px; margin-bottom: calc(8px * var(--sp)); }
    .sec, .sec:first-child { margin-top: calc(16px * var(--sp)); }
    .item { margin-top: calc(11px * var(--sp)); }
    .t { color: #111827; }
    .sub { font-style: italic; }
    .grp { margin-top: 3px; }
    .grp b { display: inline; }
    .grp b::after { content: ": "; }
    .tags { display: block; margin-top: 3px; }
    .tags span + span::before { content: ", "; }
    .line { display: inline; }
    .line + .line::before { content: " | "; }
  `,
  draw: {
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency)})` : "")).join(", ")}</p>`; },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <h1>${h.esc(b.name)}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => h.link(c, c.text)).join(" | ")}</div>
      ${slot.main}
    </div>`;
  },
});
