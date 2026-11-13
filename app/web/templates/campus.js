/* Campus: the format Indian colleges and recruiters expect from a
 * fresher. Education as a table, projects and internships, personal
 * details, and a signed declaration at the end. */
Resume.template({
  id: "campus", name: "Campus", order: 7,
  description: "Fresher format: education table, projects, personal details and a declaration",
  width: 794, accent: "#1e3a5f", fonts: { head: "Source Serif 4", body: "Source Serif 4" }, dateFmt: "short", joiner: ", ",
  tags: ["simple", "india", "student"], ats: "high", example: "fresher",
  slots: { main: ["summary", "education", "work", "projects", "skills", "awards", "certificates", "personal", "declaration"] },
  own: ["contact"], titles: { summary: "Career objective", work: "Internships and experience", skills: "Technical skills", awards: "Achievements" },
  css: `
    .doc { font-size: 12.2px; line-height: 1.5; color: #1f2430; }
    .page { padding-inline: calc(52px * var(--pad)); }
    .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; border-bottom: 2px solid var(--accent); padding-bottom: 10px; }
    h1 { font-size: 27px; font-weight: 700; color: var(--accent); line-height: 1.15; }
    .label { font-size: 13px; margin-top: 2px; }
    .contact { text-align: right; font-size: 11.5px; line-height: 1.55; }
    h2 { font-size: 12.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--accent);
         background: color-mix(in srgb, var(--accent) 9%, #fff); padding: 3px 8px; border-left: 3px solid var(--accent); margin-bottom: calc(8px * var(--sp)); }
    .sec, .sec:first-child { margin-top: calc(15px * var(--sp)); }
    table { width: 100%; border-collapse: collapse; font-size: 11.8px; }
    th, td { border: 1px solid #aeb6c2; padding: 4px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f4f8; font-weight: 600; }
    .item { margin-top: calc(9px * var(--sp)); }
    .sub { font-style: italic; }
    .tags { display: block; font-style: italic; color: #4b5563; margin-top: 2px; }
    .tags::before { content: "Tools: "; }
    .tags span + span::before { content: ", "; }
    .grp, .fact { margin-top: 3px; }
    .grp b { display: inline-block; min-width: 24%; }
    .sec-personal { break-inside: avoid; }
    .fact b { flex: 0 0 24%; }
    .sign b { text-align: center; min-width: 180px; border-top: 1px solid #1f2430; padding-top: 4px; }
  `,
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <header class="top">
        <div><h1>${h.esc(b.name)}</h1>${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}</div>
        <div class="contact">${h.contacts(b).map((c) => `<div>${h.link(c, c.text)}</div>`).join("")}</div>
      </header>
      ${slot.main}
    </div>`;
  },
  draw: {
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency)})` : "")).join(", ")}</p>`; },
    education(r, h) {
      if (!r.education.length) return "";
      return `<table class="keep"><tr><th>Qualification</th><th>Institute</th><th>Year</th><th>Score</th></tr>
        ${r.education.map((e) => `<tr><td>${h.esc(h.join([e.studyType, e.area]))}</td><td>${h.esc(e.institution)}</td>
          <td>${h.date(e.endDate || e.startDate, "year")}</td><td>${h.esc(e.score)}</td></tr>`).join("")}</table>`;
    },
  },
});
