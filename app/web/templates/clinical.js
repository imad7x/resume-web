/* Clinical: for nurses, doctors and allied health. Licences and
 * registrations come right after the summary, then clinical experience. */
Resume.template({
  id: "clinical", name: "Clinical", order: 11,
  description: "Healthcare format: licences and registrations first, then clinical experience",
  width: 794, accent: "#0f766e", fonts: { head: "Nunito Sans", body: "Nunito Sans" }, dateFmt: "short", joiner: " · ",
  tags: ["simple", "ats"], ats: "high", example: "nurse",
  slots: { main: ["summary", "certificates", "work", "education", "skills", "awards", "languages", "volunteer", "references"] },
  own: ["contact"], titles: { summary: "Profile", certificates: "Licences and registrations", work: "Clinical experience", skills: "Clinical skills" },
  css: `
    .doc { font-size: 12.3px; line-height: 1.5; color: #1b2a2a; }
    .page { padding-inline: calc(52px * var(--pad)); }
    .top { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; padding-bottom: 12px;
           border-bottom: 3px solid var(--accent); }
    h1 { font-size: 28px; font-weight: 800; color: #0b2a28; line-height: 1.1; }
    .label { font-size: 13.5px; font-weight: 700; color: var(--accent); margin-top: 3px; }
    .contact { text-align: right; font-size: 11.4px; line-height: 1.6; color: #36504e; }
    h2 { display: flex; align-items: center; gap: 10px; font-size: 12.6px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
         color: var(--accent); margin-bottom: calc(8px * var(--sp)); }
    h2::after { content: ""; flex: 1; height: 1px; background: color-mix(in srgb, var(--accent) 30%, #fff); }
    .sec, .sec:first-child { margin-top: calc(16px * var(--sp)); }
    .sec-certificates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
    .sec-certificates > h2 { grid-column: 1 / -1; margin-bottom: 0; }
    .sec-certificates .item { margin: 0; padding: 7px 10px; border-radius: 6px; background: color-mix(in srgb, var(--accent) 7%, #fff);
                              border-left: 3px solid var(--accent); }
    .item { margin-top: calc(10px * var(--sp)); }
    .t { color: #0b2a28; font-weight: 800; }
    .grp b { font-weight: 800; color: #0b2a28; }
  `,
  draw: {
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency.toLowerCase())})` : "")).join(", ")}</p>`; },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <div class="top"><div><h1>${h.esc(b.name)}</h1>${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}</div>
        <div class="contact">${h.contacts(b).map((c) => `<div>${h.link(c, c.text)}</div>`).join("")}</div></div>
      ${slot.main}
    </div>`;
  },
});
