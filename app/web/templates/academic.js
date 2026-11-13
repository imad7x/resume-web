/* Academic: a long-form CV. Years in a left margin column, entries hang
 * to the right; publications list authors, title, venue. Any length. */
Resume.template({
  id: "academic", name: "Academic CV", order: 8,
  description: "Long-form serif CV with years in the margin; publications, grants, teaching",
  width: 794, accent: "#7c2d12", fonts: { head: "EB Garamond", body: "EB Garamond" }, dateFmt: "year", joiner: ", ",
  tags: ["simple", "academic"], ats: "high", example: "academic",
  slots: { main: ["summary", "education", "work", "publications", "awards", "skills", "languages", "references"] },
  own: ["contact"], titles: { summary: "Research interests", work: "Academic appointments", awards: "Grants and awards" },
  css: `
    .doc { font-size: 13.6px; line-height: 1.42; color: #1c1917; }
    .page { padding-inline: calc(62px * var(--pad)); }
    h1 { font-size: 30px; font-weight: 500; text-align: center; letter-spacing: .04em; }
    .label { text-align: center; font-style: italic; font-size: 15px; }
    .contact { text-align: center; margin-top: 5px; font-size: 13px; }
    h2 { font-size: 14.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--accent);
         border-bottom: 1px solid #a8a29e; padding-bottom: 2px; margin-bottom: calc(8px * var(--sp)); }
    .sec, .sec:first-child { margin-top: calc(18px * var(--sp)); }
    .item { display: flex; gap: 14px; margin-top: calc(6px * var(--sp)); }
    .item .yr { flex: 0 0 92px; color: #57534e; font-variant-numeric: oldstyle-nums; }
    .item .what { flex: 1; min-width: 0; }
    .t { font-weight: 600; }
    .pub .t { font-weight: 400; font-style: italic; }
    .pts { margin-top: 2px; }
    .grp b { display: inline; font-weight: 600; }
    .grp b::after { content: ": "; }
    .sec-custom .pts { list-style: none; padding-left: 106px; }
  `,
  frame(r, h, slot) {
    const b = r.basics;
    return `<div class="page col">
      <h1>${h.esc(b.name)}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => h.link(c, c.text)).join(" &nbsp;·&nbsp; ")}</div>
      ${slot.main}
    </div>`;
  },
  item(it, h, c) {
    const pts = (it.points || []).length ? `<ul class="pts">${it.points.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "";
    const what = c.key === "publications"
      ? `${it.text ? h.esc(it.text) + ". " : ""}<span class="t">${h.esc(it.title)}</span>${it.sub ? ". " + h.esc(it.sub) : ""}.`
      : `<span class="t">${h.esc(it.title)}</span>${it.sub ? ", " + h.esc(it.sub) : ""}${it.where ? ", " + h.esc(it.where) : ""}${it.note ? " (" + h.esc(it.note) + ")" : ""}
         ${c.key !== "publications" && it.text ? `<div>${h.md(it.text)}</div>` : ""}${pts}${(it.lines || []).map((l) => `<div>${h.esc(l)}</div>`).join("")}`;
    return `<div class="item keep${c.key === "publications" ? " pub" : ""}"><span class="yr">${it.when || ""}</span><div class="what">${what}</div></div>`;
  },
  draw: {
    languages(r, h) { return `<p>${r.languages.map((l) => h.esc(l.language) + (l.fluency ? ` (${h.esc(l.fluency.toLowerCase())})` : "")).join(", ")}</p>`; },
  },
});
