/* Masthead: a dark band across the top with the photo and a two-weight
 * name; a narrow column with skill bars beside a tinted experience panel. */
Resume.template({
  id: "masthead", name: "Masthead", order: 5,
  description: "Dark band with photo and name, skill bars, experience on a tinted panel",
  width: 794, accent: "#37373a", fonts: { head: "Montserrat", body: "Lato" }, dateFmt: "year",
  tags: ["photo", "creative"], ats: "low", example: "designer", skills: "bars",
  slots: { side: ["summary", "education", "skills", "languages"], main: ["work", "projects", "interests"] },
  own: ["contact"], titles: { work: "Work experience", interests: "Hobbies" },
  css: `
    .doc { font-size: 11.6px; line-height: 1.6; color: #45454a; }
    .doc::before { content: ""; top: 0; bottom: 0; right: 0; width: 61%; background: #e7e7e8; }
    .band { display: flex; align-items: center; gap: 26px; background: var(--accent); color: #fff; padding: 30px calc(40px * var(--pad)); }
    .band .photo { width: 96px; height: 112px; flex: none; border-radius: 10px; border: 3px solid rgba(255, 255, 255, .75); }
    .band .photo.initials { background: rgba(255, 255, 255, .1); font-size: 34px; }
    .name { flex: 1; min-width: 0; }
    .first { display: block; font-family: var(--font-head); font-size: 27px; font-weight: 400; letter-spacing: .18em; text-transform: uppercase; line-height: 1.1; }
    h1 { font-size: 40px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; line-height: 1.12; }
    .label { font-size: 9.5px; letter-spacing: .3em; text-transform: uppercase; margin-top: 6px; opacity: .85; }
    .contact { width: 30%; flex: none; border-left: 1px solid rgba(255, 255, 255, .45); padding-left: 20px; font-size: 10.5px; }
    .contact .c { margin: 0; padding: 5px 0; }
    .contact .c + .c { border-top: 1px solid rgba(255, 255, 255, .22); }
    .contact .ico { width: 10px; height: 10px; }
    .cols { display: flex; }
    .side { width: 39%; flex: none; padding-inline: calc(40px * var(--pad)) calc(22px * var(--pad)); }
    .main { flex: 1; min-width: 0; padding-inline: calc(26px * var(--pad)) calc(38px * var(--pad)); }
    h2 { font-size: 12.5px; font-weight: 700; letter-spacing: .26em; text-transform: uppercase; color: #2c2c30; margin-bottom: calc(14px * var(--sp)); }
    h2::after { content: ""; display: block; width: 30px; height: 3px; background: #2c2c30; margin-top: 8px; }
    .sec { margin-top: calc(28px * var(--sp)); }
    .t, .when { color: #2c2c30; }
    .side .item { margin-top: calc(12px * var(--sp)); }
    .side .when { display: block; font-weight: 700; letter-spacing: .08em; }
    .side .t { display: block; text-transform: uppercase; letter-spacing: .08em; font-size: 11px; }
    .main .when { display: block; font-weight: 700; letter-spacing: .06em; }
    .main .t { letter-spacing: .14em; text-transform: uppercase; font-size: 11px; }
    .main .item { margin-top: calc(18px * var(--sp)); }
    .text { margin-top: 5px; }
    .skill { margin-top: calc(9px * var(--sp)); color: #2c2c30; }
    .skill > span:first-child { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #45454a; }
    .skill .bar { height: 5px; border-radius: 3px; background: #cfcfd2; }
    .grp b { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 4px; }
    .pipes { letter-spacing: .14em; text-transform: uppercase; font-size: 10.5px; line-height: 2; color: #2c2c30; }
  `,
  frame(r, h, slot) {
    const b = r.basics, words = b.name.split(/\s+/), last = words.pop() || "";
    return `
      <header class="band">
        ${h.avatar(b)}
        <div class="name">${words.length ? `<span class="first">${h.esc(words.join(" "))}</span>` : ""}<h1>${h.esc(last)}</h1>
          ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}</div>
        <div class="contact">${h.contacts(b).slice(0, 5).map((c) => `<div class="c">${h.icon(c.kind)}<span>${h.link(c, c.text)}</span></div>`).join("")}</div>
      </header>
      <div class="cols"><aside class="side col">${slot.side}</aside><main class="main col">${slot.main}</main></div>`;
  },
  draw: {
    interests(r, h) {
      return `<div class="pipes">${r.interests.map((i) => h.esc(i.name)).filter(Boolean).join(" &nbsp;|&nbsp; ")}</div>`;
    },
    languages(r, h) {
      return r.languages.map((l) => `<div class="skill keep"><span>${h.esc(l.language)}</span>${h.bar(h.level(l.fluency) || 3)}</div>`).join("");
    },
  },
  item(it, h, c) {
    const pts = (it.points || []).length ? `<ul class="pts">${it.points.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "";
    if (c.slot === "side") {
      return `<div class="item keep">${it.when ? `<span class="when">${it.when}</span>` : ""}<b class="t">${h.esc(it.title)}</b>
        ${it.sub ? `<div>${h.esc(it.sub)}</div>` : ""}${it.where || it.note ? `<div>${h.esc(h.join([it.where, it.note], " · "))}</div>` : ""}</div>`;
    }
    return `<div class="item">
      <div class="keep">${it.when ? `<span class="when">${it.when}</span>` : ""}
        <b class="t">${h.esc(h.join([it.sub, it.title], "  |  "))}</b></div>
      ${it.text ? `<p class="text">${h.md(it.text)}</p>` : ""}${pts}
    </div>`;
  },
});
