/* US federal: the long, plain format USAJOBS hiring staff expect. Personal
 * details (citizenship, veterans' preference, clearance) near the top,
 * numeric dates, and for each job a details line (hours a week, grade,
 * supervisor) taken from the job's description, then every duty. */
Resume.template({
  id: "federal", name: "US federal", order: 12,
  description: "USAJOBS format: citizenship and clearance up top, numeric dates, hours and grade for each job",
  width: 816, accent: "#1f2937", fonts: { head: "IBM Plex Sans", body: "IBM Plex Sans" }, dateFmt: "num", joiner: "; ",
  tags: ["simple", "ats"], ats: "high", example: "federal",
  slots: { main: ["personal", "summary", "work", "education", "certificates", "skills", "awards", "volunteer", "languages", "references"] },
  own: ["contact"], titles: { personal: "Federal details", summary: "Summary", work: "Work experience", certificates: "Certifications and training" },
  css: `
    .doc { font-size: 11.8px; line-height: 1.5; color: #111827; }
    .page { padding-inline: calc(60px * var(--pad)); }
    h1 { font-size: 22px; font-weight: 700; color: #111827; }
    .label { font-size: 12.6px; margin-top: 1px; color: #374151; }
    .contact { margin-top: 5px; color: #374151; }
    .contact div { display: inline; }
    .contact div + div::before { content: "  |  "; white-space: pre; color: #9ca3af; }
    h2 { font-size: 12.4px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--accent);
         background: #f3f4f6; padding: 3px 8px; margin-bottom: calc(8px * var(--sp)); border-left: 3px solid var(--accent); }
    .sec, .sec:first-child { margin-top: calc(15px * var(--sp)); }
    .sec-personal .fact { margin-top: 2px; }
    .sec-personal .fact b { flex-basis: 30%; }
    .item { margin-top: calc(13px * var(--sp)); }
    .sec-work .item + .item { padding-top: calc(11px * var(--sp)); border-top: 1px dashed #d1d5db; }
    .t { font-size: 12.6px; font-weight: 700; }
    .when { font-weight: 600; }
    .sub { font-weight: 600; }
    .sec-work .text { margin-top: 4px; font-size: 11.2px; color: #374151; }
    .sec-work .pts { margin-top: 4px; }
    .grp b { font-weight: 700; }
  `,
  draw: {
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency)})` : "")).join("; ")}</p>`; },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <h1>${h.esc(b.name)}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => `<div>${h.link(c, c.text)}</div>`).join("")}</div>
      ${slot.main}
    </div>`;
  },
});
