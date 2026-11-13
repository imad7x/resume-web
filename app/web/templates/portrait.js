/* Portrait: a deep sidebar with a round photo, contact, education and
 * expertise; the name, profile and a timeline of roles on the right. */
Resume.template({
  id: "portrait", name: "Portrait", order: 2,
  description: "Deep sidebar with a round photo, roles on a timeline, references side by side",
  width: 794, accent: "#2b3350", fonts: { head: "Poppins", body: "Lato" }, dateFmt: "year",
  tags: ["photo", "sidebar"], ats: "medium", example: "marketing", skills: "lines",
  slots: { side: ["contact", "education", "skills", "languages"], main: ["work", "projects", "references"] },
  own: ["summary"], titles: { skills: "Expertise", languages: "Language" },
  css: `
    .doc { display: flex; font-size: 12px; line-height: 1.55; color: #3d4250; }
    .doc::before { content: ""; top: 0; bottom: 0; left: 0; width: 35%; background: var(--accent); }
    .side { width: 35%; flex: none; color: #dfe3ee; padding-inline: calc(28px * var(--pad)); }
    .main { flex: 1; min-width: 0; padding-inline: calc(28px * var(--pad)) calc(34px * var(--pad)); }
    .side .photo { width: 152px; height: 152px; border-radius: 50%; margin: 0 auto calc(26px * var(--sp)); border: 4px solid rgba(255, 255, 255, .92); }
    .side .photo.initials { background: rgba(255, 255, 255, .1); font-size: 46px; color: #fff; }
    h1 { font-size: 37px; line-height: 1.08; font-weight: 700; color: var(--accent); }
    .label { font-family: var(--font-head); font-size: 15px; letter-spacing: .16em; color: #4d5364; margin-top: 7px; }
    .summary { margin-top: 12px; }
    h2 { font-size: 17px; font-weight: 600; color: var(--accent); padding-bottom: 6px; border-bottom: 2.5px solid #cbcfd8; margin-bottom: calc(13px * var(--sp)); }
    .side h2 { color: #fff; border-bottom: 1.5px solid rgba(255, 255, 255, .45); }
    .main .sec, .main .sec:first-child { margin-top: calc(24px * var(--sp)); }
    .side .sec { margin-top: calc(26px * var(--sp)); }
    .ct { margin-top: 10px; word-break: break-word; }
    .ct b { display: block; color: #fff; font-size: 11.5px; }
    .side .item { margin-top: calc(11px * var(--sp)); }
    .side .item .t { display: block; color: #fff; line-height: 1.3; }
    .side .when, .side .sub { font-size: 11px; }
    .side .plain li { position: relative; padding: 0 0 0 15px; margin-top: calc(7px * var(--sp)); }
    .side .plain li::before { content: ""; position: absolute; left: 1px; top: .58em; width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
    .side .grp b { color: #fff; margin-top: 4px; }
    .tl { position: relative; padding-left: 24px; }
    .tl::before { content: ""; position: absolute; left: 0; top: 4px; width: 9px; height: 9px; border: 1.6px solid #5d6477; border-radius: 50%; background: #fff; }
    .tl::after { content: ""; position: absolute; left: 5.2px; top: 17px; bottom: calc(-13px * var(--sp) - 3px); width: 1.6px; background: #a7adbb; }
    .tl:last-child::after { bottom: 2px; }
    .main .when { font-weight: 700; color: #5a6071; letter-spacing: .04em; }
    .main .sub { color: #7a8090; letter-spacing: .03em; }
    .main .t { display: block; color: #1f2430; font-size: 12.5px; margin-top: 2px; }
    .text { margin-top: 5px; }
    .pts li::marker { color: #8b91a1; }
    .sec-references { display: grid; grid-template-columns: 1fr 1fr; column-gap: 26px; }
    .sec-references h2 { grid-column: 1 / -1; }
    .sec-references .item { margin-top: 0; }
    .sec-references .t { font-size: 13.5px; font-family: var(--font-head); }
    .line { font-size: 11px; }
  `,
  frame(r, h, slot) {
    const b = r.basics;
    return `
      <aside class="side col">${h.avatar(b)}${slot.side}</aside>
      <main class="main col">
        <h1>${h.esc(b.name)}</h1>
        ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
        ${b.summary ? `<p class="summary">${h.md(b.summary)}</p>` : ""}
        ${slot.main}
      </main>`;
  },
  draw: {
    contact(r, h) {
      const names = { phone: "Phone", email: "Email", location: "Address", website: "Website", linkedin: "LinkedIn", github: "GitHub", gitlab: "GitLab", x: "X", link: "Link" };
      return h.contacts(r.basics).map((c) => `<div class="ct"><b>${names[c.kind]}</b><span>${h.link(c, c.text)}</span></div>`).join("");
    },
  },
  item(it, h, c) {
    const pts = (it.points || []).length ? `<ul class="pts">${it.points.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "";
    if (c.slot === "side") {
      return `<div class="item keep">${it.when ? `<div class="when">${it.when}</div>` : ""}<b class="t">${h.esc(it.title)}</b>
        ${it.sub ? `<div class="sub">${h.esc(h.join([it.sub, it.note], " · "))}</div>` : ""}</div>`;
    }
    return `<div class="item${it.when ? " tl" : ""}">
      <div class="keep">${it.when ? `<div class="when">${it.when}</div>` : `<b class="t">${h.esc(it.title)}</b>`}
        ${it.sub || it.where ? `<div class="sub">${h.esc(h.join([it.sub, it.where], " | "))}</div>` : ""}
        ${it.when ? `<b class="t">${h.esc(it.title)}</b>` : ""}</div>
      ${it.text ? `<p class="text">${h.md(it.text)}</p>` : ""}${pts}
      ${(it.lines || []).map((l) => `<div class="line">${h.esc(l)}</div>`).join("")}
    </div>`;
  },
});
