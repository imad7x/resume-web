/* Counsel: the conservative format law firms and courts expect. Bar
 * admissions near the top, education before experience, serif type. */
Resume.template({
  id: "legal", name: "Counsel", order: 12,
  description: "Legal format: bar admissions, education, then practice experience; quiet serif",
  width: 794, accent: "#1f2937", fonts: { head: "EB Garamond", body: "EB Garamond" }, dateFmt: "long", joiner: "; ",
  tags: ["simple", "ats"], ats: "high", example: "lawyer",
  slots: { main: ["summary", "certificates", "education", "work", "publications", "awards", "languages", "volunteer", "references"] },
  own: ["contact"], titles: { summary: "Profile", certificates: "Bar admissions", work: "Experience", awards: "Honours" },
  css: `
    .doc { font-size: 13.4px; line-height: 1.45; color: #111; }
    .page { padding-inline: calc(64px * var(--pad)); }
    h1 { font-size: 27px; font-weight: 500; text-align: center; letter-spacing: .14em; text-transform: uppercase; }
    .label { text-align: center; font-style: italic; font-size: 14.5px; margin-top: 2px; }
    .contact { text-align: center; font-size: 12.6px; margin-top: 4px; padding-bottom: 9px; border-bottom: 3px double #444; }
    h2 { font-size: 13.4px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; text-align: center;
         margin-bottom: calc(7px * var(--sp)); }
    .sec, .sec:first-child { margin-top: calc(16px * var(--sp)); }
    .item { margin-top: calc(8px * var(--sp)); }
    .t { font-weight: 600; }
    .sub { font-style: italic; }
    .grp b { font-weight: 600; }
    .grp b::after { content: ": "; }
  `,
  draw: {
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency.toLowerCase())})` : "")).join(", ")}</p>`; },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <h1>${h.esc(b.name)}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => h.link(c, c.text)).join(" &nbsp;•&nbsp; ")}</div>
      ${slot.main}
    </div>`;
  },
});
