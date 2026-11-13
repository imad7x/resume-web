/* Editorial: a magazine page on soft grey paper. A very large surname,
 * contact beside it, a tall photo above the skills in a narrow right column. */
Resume.template({
  id: "editorial", name: "Editorial", order: 4,
  description: "Magazine look on grey paper: oversized surname, tall photo, ruled headings",
  width: 794, accent: "#2f2f2c", fonts: { head: "Montserrat", body: "Inter" }, dateFmt: "year",
  tags: ["photo", "creative"], ats: "low", example: "content", skills: "lines",
  slots: { main: ["work", "education", "certificates"], side: ["skills", "projects", "languages"] },
  own: ["summary", "contact"], rest: "main", titles: { projects: "Portfolio" },
  css: `
    .doc { --paper: #e2e3e5; font-size: 12px; line-height: 1.55; color: #26262a; }
    .page { padding-inline: calc(44px * var(--pad)); }
    .top { display: flex; justify-content: space-between; gap: 30px; align-items: flex-start; }
    .first { display: block; font-family: var(--font-head); font-size: 25px; letter-spacing: .22em; text-transform: uppercase; font-weight: 400; line-height: 1.1; }
    h1 { font-size: 62px; line-height: .98; font-weight: 700; letter-spacing: .01em; text-transform: uppercase; color: var(--accent); margin-top: 6px; overflow-wrap: anywhere; }
    .contact { width: 31%; flex: none; padding-top: 4px; }
    .contact .c { margin-top: 0; margin-bottom: 11px; }
    .contact .ico { width: 13px; height: 13px; color: #6d6d70; }
    .cols { display: flex; gap: 7%; margin-top: 26px; }
    .main { flex: 1; min-width: 0; }
    .side { width: 31%; flex: none; }
    .side .photo { width: 100%; aspect-ratio: 4 / 4.3; height: auto; margin-bottom: calc(26px * var(--sp)); filter: grayscale(1); }
    .side .photo.initials { background: #cfd0d3; font-size: 54px; color: #77777b; }
    h2 { position: relative; font-size: 14.5px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #1d1d20;
         padding-bottom: 8px; border-bottom: 1.5px solid #2c2c30; margin-bottom: calc(13px * var(--sp)); }
    .main h2::after { content: ""; position: absolute; right: 2px; top: 3px; width: 13px; height: 13px;
         background: linear-gradient(#77777b, #77777b) center / 100% 2.5px no-repeat, linear-gradient(#77777b, #77777b) center / 2.5px 100% no-repeat; }
    h2.role { border: 0; padding: 0; margin-bottom: 9px; font-size: 16px; }
    h2.role::after { display: none; }
    .sec, .sec:first-child { margin-top: calc(26px * var(--sp)); }
    .side .sec:first-child { margin-top: 0; }
    .t { font-size: 12.5px; }
    .row2 { margin-top: 1px; }
    .pts { margin-top: 8px; padding-left: 20px; }
    .side .plain, .side .pts { list-style: disc; padding-left: 20px; margin-top: 0; }
    .side li { margin-top: calc(5px * var(--sp)); }
    .side .t { display: block; }
    .side .item { margin-top: calc(10px * var(--sp)); }
  `,
  frame(r, h, slot) {
    const b = r.basics, words = b.name.split(/\s+/), last = words.pop() || "";
    return `<div class="page col">
      <header class="top">
        <div>${words.length ? `<span class="first">${h.esc(words.join(" "))}</span>` : ""}<h1>${h.esc(last)}</h1></div>
        <div class="contact">${h.contacts(b).map((c) => `<div class="c">${h.icon(c.kind)}<span>${h.link(c, c.text)}</span></div>`).join("")}</div>
      </header>
      <div class="cols">
        <main class="main">
          ${b.label ? `<h2 class="role head">${h.esc(b.label)}</h2>` : ""}
          ${b.summary ? `<p class="summary">${h.md(b.summary)}</p>` : ""}
          ${slot.main}
        </main>
        <aside class="side">${h.avatar(b)}${slot.side}</aside>
      </div>
    </div>`;
  },
  draw: {
    languages(r, h) {
      return `<ul class="pts">${r.languages.map((l) => `<li>${h.esc(l.language)}${l.fluency ? ` (${h.esc(l.fluency)})` : ""}</li>`).join("")}</ul>`;
    },
  },
  item(it, h, c) {
    const pts = (it.points || []).length ? `<ul class="pts">${it.points.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "";
    if (c.slot === "side") {
      return `<div class="item keep"><b class="t">${h.esc(it.url ? it.url.replace(/^https?:\/\//, "") : it.title)}</b>
        ${it.text || it.sub ? `<div>${h.md(it.text || it.sub)}</div>` : ""}</div>`;
    }
    return `<div class="item">
      <div class="keep"><b class="t">${h.esc(it.title)}</b>
        <div class="row2"><span>${h.esc(h.join([it.sub, it.where]))}</span>${it.when ? `<span class="when">${it.when}</span>` : ""}</div></div>
      ${it.text ? `<p class="text">${h.md(it.text)}</p>` : ""}${pts}
    </div>`;
  },
});
