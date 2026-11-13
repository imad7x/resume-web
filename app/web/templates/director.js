/* Director: a slate sidebar with the photo and contact; the name centred
 * in a quiet band above profile, experience and a two-column skill list. */
Resume.template({
  id: "director", name: "Director", order: 3,
  description: "Slate sidebar with photo, name centred in a soft band, short rules under headings",
  width: 794, accent: "#22313f", fonts: { head: "Raleway", body: "Lato" }, dateFmt: "short",
  tags: ["photo", "sidebar"], ats: "medium", example: "creative", skills: "lines",
  slots: { side: ["contact", "education", "references", "languages"], main: ["summary", "work", "skills", "projects"] },
  titles: { work: "Work experience" },
  css: `
    .doc { display: flex; font-size: 11.8px; line-height: 1.6; color: #3b3f46; }
    .doc::before { content: ""; top: 0; bottom: 0; left: 0; width: 34.5%; background: var(--accent); }
    .side { width: 34.5%; flex: none; color: #d6dce3; padding-inline: calc(30px * var(--pad)) calc(24px * var(--pad)); }
    .main { flex: 1; min-width: 0; padding-inline: calc(34px * var(--pad)); }
    .side .photo { width: 148px; height: 148px; border-radius: 50%; margin: 6px auto calc(34px * var(--sp)); border: 3px solid rgba(255, 255, 255, .85); }
    .side .photo.initials { background: rgba(255, 255, 255, .1); font-size: 44px; color: #fff; }
    .band { margin: calc(-1 * var(--mg)) calc(-34px * var(--pad)) 0; padding: calc(var(--mg) + 22px) 20px 34px; background: #f1f1f2; text-align: center; }
    h1 { font-size: 30px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: #2a2e35; line-height: 1.2; }
    .band i { display: block; width: 46px; height: 1.5px; background: #2a2e35; margin: 14px auto 13px; }
    .label { font-family: var(--font-head); font-size: 12.5px; letter-spacing: .22em; text-transform: uppercase; color: #4a4f58; }
    h2 { font-size: 14px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #23272e; margin-bottom: calc(14px * var(--sp)); }
    h2::after { content: ""; display: block; width: 44px; height: 1.5px; background: currentColor; margin-top: 9px; }
    .side h2 { color: #fff; font-weight: 500; }
    .side h2::after { background: rgba(255, 255, 255, .6); }
    .sec, .main .sec:first-child { margin-top: calc(30px * var(--sp)); }
    .side .sec:first-of-type { margin-top: 0; }
    .c .ico { width: 11px; height: 11px; opacity: .9; }
    .t { color: #1f2329; }
    .side .t { color: #fff; display: block; }
    .side .item { margin-top: calc(13px * var(--sp)); }
    .side .when { display: block; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; }
    .sub { font-style: italic; }
    .main .when { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #7b808a; }
    .main .item { margin-top: calc(16px * var(--sp)); }
    .text { margin-top: 5px; }
    .line { font-size: 11px; }
    .sec-references .t { text-transform: uppercase; letter-spacing: .06em; font-size: 11.5px; }
    .sec-skills .plain { columns: 2; column-gap: 28px; }
    .sec-skills .plain li { margin-bottom: calc(6px * var(--sp)); break-inside: avoid; }
    .sec-skills .grp b { margin-bottom: 4px; }
  `,
  frame(r, h, slot) {
    const b = r.basics;
    return `
      <aside class="side col">${h.avatar(b)}${slot.side}</aside>
      <main class="main col">
        <header class="band"><h1>${h.esc(b.name)}</h1>${b.label ? `<i></i><div class="label">${h.esc(b.label)}</div>` : ""}</header>
        ${slot.main}
      </main>`;
  },
  item(it, h, c) {
    const pts = (it.points || []).length ? `<ul class="pts">${it.points.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "";
    const lines = (it.lines || []).map((l) => `<div class="line">${h.esc(l)}</div>`).join("");
    if (c.slot === "side") {
      return `<div class="item keep"><b class="t">${h.esc(it.title)}</b>${it.when ? `<span class="when">${it.when}</span>` : ""}
        ${it.sub ? `<div class="sub">${h.esc(h.join([it.sub, it.where, it.note], " · "))}</div>` : ""}${lines}</div>`;
    }
    return `<div class="item">
      <div class="keep"><div class="row1"><b class="t">${h.esc(it.title)}</b>${it.when ? `<span class="when">${it.when}</span>` : ""}</div>
        ${it.sub || it.where ? `<div class="sub">${h.esc(h.join([it.sub, it.where]))}</div>` : ""}</div>
      ${it.text ? `<p class="text">${h.md(it.text)}</p>` : ""}${pts}${lines}
    </div>`;
  },
});
