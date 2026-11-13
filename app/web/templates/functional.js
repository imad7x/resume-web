/* Skills first (functional): for career changers and people with gaps.
 * What you can do comes first, then the best results from every role
 * pooled into one list, then a short work history without points. */
Resume.template({
  id: "functional", name: "Skills first", order: 9,
  description: "Functional format: skills and your best results first, then a short work history",
  width: 794, accent: "#0f5e6e", fonts: { head: "Lato", body: "Lato" }, dateFmt: "short", joiner: " · ",
  tags: ["simple", "ats"], ats: "high", example: "content",
  slots: { main: ["summary", "skills", "work", "projects", "education", "certificates", "languages", "awards"] },
  own: ["contact"], titles: { summary: "Profile", skills: "What I do", work: "Results and work history" },
  css: `
    .doc { font-size: 12.4px; line-height: 1.5; color: #1d2733; }
    .page { padding-inline: calc(56px * var(--pad)); }
    .top { border-left: 5px solid var(--accent); padding: 2px 0 2px 16px; }
    h1 { font-size: 29px; font-weight: 700; line-height: 1.1; color: #0d1b26; }
    .label { font-size: 14px; color: var(--accent); font-weight: 700; margin-top: 3px; }
    .contact { margin-top: 7px; font-size: 11.6px; color: #3c4a57; }
    h2 { font-size: 12.6px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--accent);
         padding-bottom: 4px; border-bottom: 1.5px solid color-mix(in srgb, var(--accent) 35%, #fff); margin-bottom: calc(9px * var(--sp)); }
    .sec, .sec:first-child { margin-top: calc(17px * var(--sp)); }
    .sec-skills { display: grid; grid-template-columns: 1fr 1fr; gap: calc(9px * var(--sp)) 26px; }
    .sec-skills > h2 { grid-column: 1 / -1; margin-bottom: 0; }
    .sec-skills .grp b { display: block; color: #0d1b26; font-size: 12.8px; }
    .wins { margin: 0 0 calc(12px * var(--sp)); padding-left: 17px; }
    .wins li { margin-top: 3px; }
    .wins li::marker { color: var(--accent); }
    .hist { display: grid; grid-template-columns: 1fr auto; gap: 4px 18px; }
    .hist .when { color: #56636f; white-space: nowrap; }
    .hist b { color: #0d1b26; }
    .item { margin-top: calc(9px * var(--sp)); }
    .t { color: #0d1b26; }
  `,
  draw: {
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency.toLowerCase())})` : "")).join(", ")}</p>`; },
    /* The best results from all roles (points with a number first), then each role on one line. */
    work(r, h) {
      const pts = r.work.flatMap((w, n) => (w.highlights || []).map((t, i) => ({ t, n, i, num: /\d/.test(t) })));
      const best = pts.filter((p) => p.num).concat(pts.filter((p) => !p.num)).slice(0, 7).sort((a, b) => a.n - b.n || a.i - b.i);
      const wins = best.length ? `<ul class="wins">${best.map((p) => `<li>${h.md(p.t)}</li>`).join("")}</ul>` : "";
      const rows = r.work.map((w) => `<div><b>${h.esc(w.position)}</b>${w.name ? ", " + h.esc(w.name) : ""}${w.location ? `, ${h.esc(w.location)}` : ""}</div>
        <span class="when">${h.range(w, { fmt: "short" })}</span>`).join("");
      return wins + `<div class="hist keep">${rows}</div>`;
    },
  },
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <div class="top"><h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        <div class="contact">${h.contacts(b).map((c) => h.link(c, c.text)).join(" &nbsp;|&nbsp; ")}</div></div>
      ${slot.main}
    </div>`;
  },
});
