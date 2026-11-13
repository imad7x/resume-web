/* Timeline: experience along a vertical line, dates in their own column,
 * skills as tags. */
Resume.template({
  id: "timeline",
  tags: ["simple"], ats: "high", example: "marketing",
  name: "Timeline",
  description: "Career along a line with dates on the left, skills as tags",
  width: 794,
  accent: "#6d28d9",
  css: `
    .doc { font-family: "IBM Plex Sans", sans-serif; font-size: 12.5px; line-height: 1.5; color: #27272a;
           padding: 42px 46px 34px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.15; font-weight: 700; color: #18181b; }
    .label { margin-top: 4px; font-size: 15px; color: var(--accent); font-weight: 500; }
    .contact { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px 18px; color: #3f3f46; }
    .contact .ico { width: 12px; height: 12px; margin-right: 6px; color: var(--accent); }
    .summary { margin-top: 16px; padding: 12px 16px; border-radius: 8px;
               background: color-mix(in srgb, var(--accent) 7%, white); }
    h2 { margin: 24px 0 12px; font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
         color: #18181b; }
    h2::after { content: ""; display: block; width: 32px; height: 3px; margin-top: 5px; border-radius: 2px;
                background: var(--accent); }
    .tl { position: relative; }
    .ev { display: grid; grid-template-columns: 112px 1fr; gap: 0 22px; position: relative; padding-bottom: 14px; }
    .ev:last-child { padding-bottom: 0; }
    .ev::before { content: ""; position: absolute; left: 123px; top: 6px; bottom: -6px; width: 2px;
                  background: color-mix(in srgb, var(--accent) 25%, white); }
    .ev:last-child::before { display: none; }
    .ev::after { content: ""; position: absolute; left: 119px; top: 4px; width: 10px; height: 10px; border-radius: 50%;
                 background: #fff; border: 2px solid var(--accent); box-sizing: border-box; }
    .when { font-size: 11.5px; color: #71717a; text-align: right; padding-top: 1px; line-height: 1.4; }
    .what b { font-size: 13.5px; color: #18181b; }
    .org { color: var(--accent); font-weight: 500; }
    ul { margin: 5px 0 0; padding-left: 16px; }
    li { margin-top: 2px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .tag { padding: 2px 9px; border-radius: 999px; font-size: 11.5px;
           background: color-mix(in srgb, var(--accent) 10%, white); color: #3f3f46; }
    .grp + .grp { margin-top: 10px; }
    .grp b { font-size: 12px; color: #18181b; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
    .item + .item { margin-top: 8px; }
    .muted { color: #71717a; }
    p { margin: 0; }
  `,
  render(r, h) {
    const b = r.basics;
    const section = (title, body) => (body ? `<h2 class="head">${title}</h2>${body}` : "");
    const bullets = (list) => (list.length ? `<ul>${list.map((x) => `<li>${h.md(x)}</li>`).join("")}</ul>` : "");
    const when = (x) => `${h.date(x.startDate, "short")}${x.startDate ? "<br>" : ""}${x.startDate ? "to " : ""}${h.date(x.endDate, "short") || (x.startDate ? "Present" : "")}`;
    const bottom = [
      section("Education", r.education.map((e) => `
        <div class="item keep"><b>${h.esc([e.studyType, e.area].filter(Boolean).join(", "))}</b>
        <div>${h.esc(e.institution)}</div><div class="muted">${h.range(e, { fmt: "short" })}${e.score ? " · " + h.esc(e.score) : ""}</div></div>`).join("")),
      section("Certifications", r.certificates.map((c) => `
        <div class="item keep">${h.esc(c.name)}${c.issuer || c.date ? `<div class="muted">${[h.esc(c.issuer), h.date(c.date, "short")].filter(Boolean).join(" · ")}</div>` : ""}</div>`).join("")),
      section("Languages", r.languages.map((l) => `<div class="item">${h.esc(l.language)}${l.fluency ? ` <span class="muted">· ${h.esc(l.fluency)}</span>` : ""}</div>`).join("")),
    ].filter(Boolean);
    return `
      <h1>${h.esc(b.name)}</h1>
      ${b.label ? `<div class="label">${h.esc(b.label)}</div>` : ""}
      <div class="contact">${h.contacts(b).map((c) => `<span>${h.icon(c.kind)}${h.link(c, c.text)}</span>`).join("")}</div>
      ${b.summary ? `<p class="summary">${h.md(b.summary)}</p>` : ""}
      ${section("Experience", r.work.length && `<div class="tl">${r.work.map((w) => `
        <div class="ev">
          <div class="when">${when(w)}</div>
          <div class="what">
            <div class="keep"><b>${h.esc(w.position)}</b><div class="org">${h.esc([w.name, w.location].filter(Boolean).join(" · "))}</div></div>
            ${w.summary ? `<p>${h.md(w.summary)}</p>` : ""}
            ${bullets(w.highlights)}
          </div>
        </div>`).join("")}</div>`)}
      ${section("Projects", r.projects.length && `<div class="tl">${r.projects.map((p) => `
        <div class="ev">
          <div class="when">${when(p)}</div>
          <div class="what"><b class="keep">${h.esc(p.name)}</b>${p.description ? `<p>${h.md(p.description)}</p>` : ""}${bullets(p.highlights)}</div>
        </div>`).join("")}</div>`)}
      ${section("Skills", r.skills.map((g) => `
        <div class="grp keep"><b>${h.esc(g.name)}</b><div class="tags">${g.keywords.map((k) => `<span class="tag">${h.esc(k)}</span>`).join("")}</div></div>`).join(""))}
      ${bottom.length ? `<div class="split">${bottom.map((s) => `<div>${s}</div>`).join("")}</div>` : ""}`;
  },
});
