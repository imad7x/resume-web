/* One page: everything on a single sheet. A one-line header, then two
 * columns split by a hairline: experience and projects on the left, the
 * short sections on the right. Small but clear type; for up to ~6 years. */
Resume.template({
  id: "onepage", name: "One page", order: 7,
  description: "Fits on a single page: one-line header, two thin columns split by a hairline",
  width: 820, accent: "#0e7490", fonts: { head: "Inter", body: "Inter" }, dateFmt: "short", joiner: " · ",
  tags: ["simple", "compact"], ats: "medium", example: "engineer",
  slots: { main: ["summary", "work", "projects", "volunteer"], side: ["skills", "education", "certificates", "languages", "awards", "interests"] },
  own: ["contact"], titles: { summary: "Profile" },
  css: `
    .doc { font-size: 11.2px; line-height: 1.42; color: #1f2933; }
    .page { padding-inline: calc(40px * var(--pad)); }
    .top { display: flex; justify-content: space-between; align-items: baseline; gap: 18px; flex-wrap: wrap;
           padding-bottom: 9px; border-bottom: 1.5px solid #1f2933; }
    h1 { font-size: 24px; font-weight: 800; letter-spacing: -.015em; color: #111827; }
    h1 small { font-size: 13px; font-weight: 600; letter-spacing: 0; color: var(--accent); margin-left: 10px; }
    .contact { font-size: 10.6px; color: #4b5563; }
    .contact a, .contact span { white-space: nowrap; }
    .contact a + a::before, .contact span + span::before, .contact a + span::before, .contact span + a::before { content: "  ·  "; white-space: pre; color: #9ca3af; }
    .cols { display: grid; grid-template-columns: 1fr 232px; gap: 0 22px; }
    .cols > .side { border-left: 1px solid #d1d5db; padding-left: 20px; }
    h2 { font-size: 10.6px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--accent);
         margin-bottom: calc(5px * var(--sp)); }
    .sec, .sec:first-child { margin-top: calc(12px * var(--sp)); }
    .item { margin-top: calc(7px * var(--sp)); }
    .t { color: #111827; font-weight: 700; }
    .row1 { gap: 10px; }
    .when { font-size: 10.4px; color: #6b7280; white-space: nowrap; }
    .sub { font-weight: 600; color: #374151; }
    .where { color: #6b7280; }
    .pts { margin-top: 2px; padding-left: 14px; }
    .pts li { margin-top: 1px; }
    .side .grp { margin-top: 5px; }
    .side .grp b { display: block; font-size: 10.4px; color: #111827; }
    .side .tags { display: block; color: #374151; }
    .side .tags span + span::before { content: ", "; }
    .side .item { margin-top: 5px; }
    .side .row1, .side .row2 { display: block; }
    .side .when { display: block; }
  `,
  draw: {
    languages(r, h) { return r.languages.map((l) => `<div>${h.esc(l.language)}${l.fluency ? ` <span class="where">(${h.esc(l.fluency.toLowerCase())})</span>` : ""}</div>`).join(""); },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <div class="top"><h1>${h.esc(b.name)}${b.label ? `<small>${h.esc(b.label)}</small>` : ""}</h1>
        <div class="contact">${h.contacts(b).map((c) => (c.href ? h.link(c, c.text) : `<span>${c.text}</span>`)).join("")}</div></div>
      <div class="cols"><div class="main">${slot.main}</div><div class="side">${slot.side}</div></div>
    </div>`;
  },
});
