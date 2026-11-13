/* Draws a resume with a template. Used by the editor (preview, library
 * thumbnails and template gallery, each through Resume.mount) and by
 * print.html, the page Chromium prints to PDF.
 *
 * A template is one file in templates/, named <id>.js, that calls:
 *
 *   Resume.template({
 *     id: "charcoal",              // the file name without .js
 *     name: "Charcoal",            // shown in the picker
 *     description: "…",            // one line for the picker
 *     order: 1,                    // optional: lower comes first in the picker (default 100)
 *     width: 900,                  // px the design is drawn at; it is scaled to fit the paper
 *     accent: "#2563eb",           // default accent colour, available as var(--accent)
 *     css: `…`,                    // the template's styles; the page root is .doc
 *     render(r, h) { return "…" }  // the resume as HTML
 *   });
 *
 * r is the resume in the JSON Resume schema (https://jsonresume.org/schema),
 * tidied so every list exists and holds no empty entries: r.basics, r.work,
 * r.education, r.certificates, r.skills, r.projects, r.languages.
 * Every h.* helper returns HTML that is safe to insert as it is:
 *   h.esc(text)                  escaped text
 *   h.md(text)                   escaped text with **bold** kept as bold
 *   h.date("2024-12", fmt)       "December 2024" (fmt "long"), "Dec 2024" ("short"), "12/2024" ("num"), "2024" ("year")
 *   h.range(item, opts)          the item's startDate-endDate, "Present" when there is no end;
 *                                opts {fmt, sep: " - ", present: "Present"}
 *   h.location(r.basics)         "Bangalore, IN"
 *   h.contacts(r.basics)         [{kind, text, href}] for phone, email, location, website and each profile;
 *                                kind is phone|email|location|website|linkedin|github|gitlab|x|link
 *   h.icon(kind)                 a small SVG icon for a contact kind (fill: currentColor)
 *   h.link(contact, inner)       inner wrapped in a link to contact.href (or as it is without one)
 *
 *   h.photo(r.basics, cls)       an <img class="photo cls"> of the person's photo, or "" without one
 *   h.avatar(r.basics, cls)      the photo, or a block with the initials when there is none
 *   h.initials(name)             "EM" for "Elena Marsh"
 *   h.bar(level)                 a skill bar filled to level (0..5)
 *   h.level(text)                0..5 from "4", "Fluent", "Expert"…
 *
 * Class "keep" on an element keeps it on one page; "head" keeps a heading
 * with what follows. Page margins and scaling are added here, not in templates.
 *
 * Templates with sections the person can reorder, hide, rename and add to
 * (API v2) give, instead of render():
 *
 *     slots: { side: ["contact", "skills"], main: ["summary", "work", …] },
 *                                  // the columns and the sections each starts with; sections the
 *                                  // template does not name go to `rest` (default: the last slot)
 *     own: ["contact"],            // sections the frame draws itself
 *     frame(r, h, slot) { … }      // the page: header plus slot.side, slot.main (ready HTML)
 *     heading(title, c) { … }      // optional, a section heading; c = {key, slot}
 *     item(it, h, c) { … }         // optional, one entry of any list section; `it` is
 *                                  // {title, sub, where, when, note, text, points, tags, lines, url, level}
 *                                  // (when is ready HTML, everything else plain text)
 *     draw: { skills(r, h, c) {…} }// optional, the whole body of a section
 *     fonts: { head: "Poppins", body: "Lato" }, dateFmt: "short", skills: "groups|bars|chips|lines",
 *     tags: ["photo", "sidebar"], ats: "high|medium|low", example: "marketing"
 *
 * In their CSS: var(--font-head), var(--font-body), var(--accent), and
 * var(--sp) (spacing, 1 = normal) and var(--pad) (page padding, 1 = normal).
 */
(function () {
  "use strict";

  const PAPER = {                       // CSS px at 96 dpi
    a4: { size: "A4", w: 210 * 96 / 25.4, h: 297 * 96 / 25.4 },
    letter: { size: "letter", w: 8.5 * 96, h: 11 * 96 },
  };
  const MARGIN = 12 * 96 / 25.4;        // top margin of pages after the first, bottom margin of every page

  const LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*(\S(?:[^*]*\S)?)\*(?=$|[\s).,;:!?])/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  let ctx = {};                         // what the render in progress was asked for (date format, photo off)

  function date(d, fmt) {
    if (!d) return "";
    const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(String(d).trim());
    if (!m) return esc(d);                       // free text such as "Summer 2015"
    const y = m[1], mo = m[2] ? +m[2] : 0;
    fmt = ctx.dateFmt || fmt || ctx.fmt;
    if (!mo || fmt === "year") return y;
    if (fmt === "num") return String(mo).padStart(2, "0") + "/" + y;
    if (fmt === "short") return LONG[mo - 1].slice(0, 3) + " " + y;
    return LONG[mo - 1] + " " + y;
  }

  function range(item, opts) {
    const o = Object.assign({ fmt: ctx.fmt || "long", sep: ctx.sep || " - ", present: "Present" }, opts);
    const start = date(item.startDate, o.fmt), end = date(item.endDate, o.fmt);
    if (!start) return end;
    return start + esc(o.sep) + (end || esc(o.present));
  }

  const location = (b) => esc([b.location.city, b.location.region, b.location.countryCode]
    .filter(Boolean).join(", "));

  const bare = (url) => String(url).replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  const href = (url) => (/^https?:\/\//i.test(url) ? url : "https://" + url);

  function contacts(b) {
    const out = [];
    if (b.phone) out.push({ kind: "phone", text: esc(b.phone), href: "tel:" + esc(b.phone.replace(/[^\d+]/g, "")) });
    if (b.email) out.push({ kind: "email", text: esc(b.email), href: "mailto:" + esc(b.email) });
    const loc = location(b);
    if (loc) out.push({ kind: "location", text: loc, href: "" });
    if (b.url) out.push({ kind: "website", text: esc(bare(b.url)), href: esc(href(b.url)) });
    for (const p of b.profiles) {
      const net = String(p.network || "").toLowerCase().replace(/[^a-z]/g, "");
      const kind = { linkedin: "linkedin", github: "github", gitlab: "gitlab", x: "x", twitter: "x" }[net] || "link";
      const text = p.url ? bare(p.url) : (p.network ? p.network + ": " : "") + (p.username || "");
      out.push({ kind, text: esc(text), href: p.url ? esc(href(p.url)) : "" });
    }
    return out;
  }

  const link = (c, inner) => (c.href ? `<a href="${c.href}">${inner}</a>` : inner);

  const ICONS = {     // [viewBox, path]
    phone: ["0 0 8 8", "M.37 1.26 1.41.23A.79.79 0 0 1 1.96 0c.21 0 .41.08.56.23l1.11 1.11a.79.79 0 0 1 0 1.12l-.81.81c.19.42.45.8.78 1.13.33.33.71.59 1.13.78l.81-.81a.79.79 0 0 1 1.12 0l1.11 1.11a.79.79 0 0 1 0 1.12L6.74 7.63A1.27 1.27 0 0 1 5.63 7.98C4.32 7.77 3.02 7.07 1.98 6.02.93 4.98.24 3.68.02 2.37a1.27 1.27 0 0 1 .35-1.11Z"],
    email: ["0 0 8 6", "M0 2.25V4.5A1.5 1.5 0 0 0 1.5 6h5A1.5 1.5 0 0 0 8 4.5V2.25L4.2 3.96a.5.5 0 0 1-.41 0L0 2.25Zm.04-1.08L4 2.95l3.96-1.78A1.5 1.5 0 0 0 6.5 0h-5A1.5 1.5 0 0 0 .04 1.17Z"],
    location: ["0 0 7 9", "M3.52 9c.14 0 .6-.2 1.24-.84C5.8 7.15 7 5.38 7 3.72A3.6 3.6 0 0 0 3.5 0 3.6 3.6 0 0 0 0 3.72C0 6.34 2.87 8.94 3.52 9Zm-.02-7.5c.44 0 .87.19 1.18.52.31.33.49.78.49 1.25s-.18.92-.49 1.25c-.31.33-.74.52-1.18.52s-.87-.19-1.18-.52a1.8 1.8 0 0 1 0-2.5c.31-.33.74-.52 1.18-.52Z"],
    website: ["0 0 16 16", "M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm5.9 7h-2.6a12.3 12.3 0 0 0-1-4.7A6 6 0 0 1 13.9 7ZM8 2c.6.8 1.2 2.6 1.3 5H6.7C6.8 4.6 7.4 2.8 8 2ZM5.7 2.3a12.3 12.3 0 0 0-1 4.7H2.1a6 6 0 0 1 3.6-4.7ZM2.1 9h2.6c.1 1.8.4 3.4 1 4.7A6 6 0 0 1 2.1 9ZM8 14c-.6-.8-1.2-2.6-1.3-5h2.6c-.1 2.4-.7 4.2-1.3 5Zm2.3-.3c.6-1.3.9-2.9 1-4.7h2.6a6 6 0 0 1-3.6 4.7Z"],
    linkedin: ["0 0 16 16", "M0 1.15C0 .52.52 0 1.18 0h13.64C15.48 0 16 .52 16 1.15v13.7c0 .63-.52 1.15-1.18 1.15H1.18C.52 16 0 15.48 0 14.85V1.15ZM4.94 13.4V6.2H2.54v7.2h2.4ZM3.74 5.2c.84 0 1.36-.55 1.36-1.24-.02-.71-.52-1.24-1.34-1.24-.82 0-1.36.53-1.36 1.24 0 .69.52 1.24 1.32 1.24h.02Zm4.9 8.2V9.38c0-.21.02-.43.08-.58.17-.43.57-.88 1.23-.88.87 0 1.21.66 1.21 1.63v3.85h2.4V9.27c0-2.2-1.18-3.23-2.76-3.23-1.27 0-1.84.7-2.16 1.19v.02h-.02l.02-.02V6.2h-2.4c.03.68 0 7.2 0 7.2h2.4Z"],
    github: ["0 0 16 16", "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"],
    gitlab: ["0 0 16 16", "m15.73 9.12-.87-2.66L13.13 1.1a.3.3 0 0 0-.56 0L10.85 6.46H5.15L3.43 1.1a.3.3 0 0 0-.56 0L1.14 6.46.27 9.12a.6.6 0 0 0 .22.67L8 15.24l7.51-5.45a.6.6 0 0 0 .22-.67Z"],
    x: ["0 0 16 16", "M12.6.75h2.45L9.7 6.88 16 15.25h-4.94l-3.87-5.06-4.43 5.06H.31l5.73-6.55L0 .75h5.06l3.5 4.63L12.6.75Zm-.86 13.03h1.36L4.32 2.15H2.86l8.88 11.63Z"],
    link: ["0 0 16 16", "M6.35 9.65a.75.75 0 0 1 0-1.06l2.24-2.24a.75.75 0 1 1 1.06 1.06L7.41 9.65a.75.75 0 0 1-1.06 0ZM7.5 3.4l1.24-1.24a3.25 3.25 0 0 1 4.6 4.6L12.1 8a.75.75 0 0 1-1.06-1.06l1.24-1.24a1.75 1.75 0 0 0-2.48-2.48L8.56 4.46A.75.75 0 0 1 7.5 3.4ZM4.96 7.06a.75.75 0 0 1 0 1.06L3.72 9.36a1.75 1.75 0 0 0 2.48 2.48l1.24-1.24a.75.75 0 0 1 1.06 1.06l-1.24 1.24a3.25 3.25 0 0 1-4.6-4.6L3.9 7.06a.75.75 0 0 1 1.06 0Z"],
  };
  function icon(kind) {
    const [box, d] = ICONS[kind] || ICONS.link;
    return `<svg class="ico ico-${esc(kind)}" viewBox="${box}" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;
  }

  // the photo: a data: URL from the editor's photo picker, or one of the example portraits
  const PHOTO = /^(data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+|data\/examples\/[a-z0-9-]+\.(svg|jpg|png|webp))$/i;
  const photo = (b, cls) => (PHOTO.test(b.image || "")
    ? `<img class="photo ${esc(cls || "")}" src="${b.image}" alt="">` : "");
  const initials = (name) => esc(String(name || "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w[0]).filter((c) => /\p{L}/u.test(c)).slice(0, 2).join("").toUpperCase());
  const avatar = (b, cls) => photo(b, cls) || (ctx.noPhoto ? "" : `<div class="photo initials ${esc(cls || "")}">${initials(b.name)}</div>`);

  const LEVELS = [[5, /nativ|bilingual|mother|expert|master/], [4, /fluent|advanced|proficien|professional|full/],
    [3, /intermediate|conversation|working|good|limited/], [2, /elementary|basic|beginner|novice|learning/]];
  function level(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return 0;
    if (/^\d/.test(t)) { const n = parseFloat(t); return Math.max(0, Math.min(5, n > 5 ? n / 20 : n)); }
    for (const [n, re] of LEVELS) if (re.test(t)) return n;
    return 0;
  }
  // (no style attribute: the page's content security policy would drop it)
  const bar = (n) => `<span class="bar"><i class="w${Math.round(Math.max(0, Math.min(5, n)) * 2)}"></i></span>`;

  const h = { esc, md, date, range, location, contacts, icon, link, photo, avatar, initials, level, bar };

  // ------------------------------------------------------------ tidy the data
  const str = (v) => (v == null ? "" : String(v).trim());
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  const arr = (v) => (Array.isArray(v) ? v : []);
  const filled = (o) => Object.values(o).some((v) => (Array.isArray(v) ? v.length : str(v)));
  const lines = (v) => arr(v).map(str).filter(Boolean);
  const entries = (v, fields, lists) => arr(v).map(obj).filter((e) => !e.hidden).map((e) => {
    const out = {};
    for (const f of fields) out[f] = str(e[f]);
    for (const f of lists || []) out[f] = lines(e[f]);
    return out;
  }).filter(filled);

  function tidy(resume) {
    const r = obj(resume), b = obj(r.basics), loc = obj(b.location);
    return {
      basics: {
        name: str(b.name), label: str(b.label), email: str(b.email), phone: str(b.phone),
        url: str(b.url), summary: str(b.summary), image: str(b.image),
        personal: entries(b.personal, ["label", "value"]),
        location: { city: str(loc.city), region: str(loc.region), countryCode: str(loc.countryCode) },
        profiles: entries(b.profiles, ["network", "username", "url"]),
      },
      work: entries(r.work, ["name", "position", "location", "url", "startDate", "endDate", "summary"], ["highlights"]),
      education: entries(r.education, ["institution", "studyType", "area", "location", "startDate", "endDate", "score"], ["courses"]),
      certificates: entries(r.certificates, ["name", "issuer", "date", "url"]),
      skills: entries(r.skills, ["name", "level"], ["keywords"]),
      projects: entries(r.projects, ["name", "description", "url", "startDate", "endDate"], ["highlights", "keywords"]),
      languages: entries(r.languages, ["language", "fluency"]),
      volunteer: entries(r.volunteer, ["organization", "position", "url", "startDate", "endDate", "summary"], ["highlights"]),
      awards: entries(r.awards, ["title", "awarder", "date", "summary"]),
      publications: entries(r.publications, ["name", "publisher", "releaseDate", "url", "summary"]),
      interests: entries(r.interests, ["name"], ["keywords"]),
      references: entries(r.references, ["name", "position", "phone", "email", "reference"]),
      declaration: { text: str(obj(r.declaration).text), place: str(obj(r.declaration).place), date: str(obj(r.declaration).date) },
      custom: arr(r.custom).map(obj).filter((c) => /^[a-z0-9]{1,12}$/.test(c.id || "")).map((c) => ({
        id: c.id, title: str(c.title), kind: ["entries", "list", "text"].includes(c.kind) ? c.kind : "entries", text: str(c.text),
        lines: lines(c.lines),
        items: entries(c.items, ["title", "sub", "where", "startDate", "endDate", "text"], ["points"]),
      })),
    };
  }

  // ---------------------------------------------------------------- sections
  /* Every section a resume can hold. kind says how it is edited and drawn:
   * entries (dated items with points), rows (short lines), tags, facts, text. */
  const SECTIONS = {
    summary: { title: "Profile", kind: "text" },
    contact: { title: "Contact", kind: "contact" },
    work: { title: "Experience", kind: "entries" },
    education: { title: "Education", kind: "entries" },
    skills: { title: "Skills", kind: "tags" },
    projects: { title: "Projects", kind: "entries" },
    certificates: { title: "Certifications", kind: "rows" },
    languages: { title: "Languages", kind: "rows" },
    volunteer: { title: "Volunteering", kind: "entries" },
    awards: { title: "Awards", kind: "rows" },
    publications: { title: "Publications", kind: "rows" },
    references: { title: "References", kind: "rows" },
    interests: { title: "Interests", kind: "tags" },
    personal: { title: "Personal details", kind: "facts" },
    declaration: { title: "Declaration", kind: "text" },
  };
  const join = (a, sep) => a.filter(Boolean).join(sep || ", ");
  const SHAPE = {       // a section's entry as the generic item templates draw
    work: (w) => ({ title: w.position, sub: w.name, where: w.location, when: range(w), text: w.summary, points: w.highlights, url: w.url }),
    education: (e) => ({ title: join([e.studyType, e.area]), sub: e.institution, where: e.location, when: range(e), note: e.score, points: e.courses }),
    projects: (p) => ({ title: p.name, when: range(p), text: p.description, points: p.highlights, tags: p.keywords, url: p.url }),
    volunteer: (v) => ({ title: v.position, sub: v.organization, when: range(v), text: v.summary, points: v.highlights, url: v.url }),
    certificates: (c) => ({ title: c.name, sub: c.issuer, when: date(c.date), url: c.url }),
    awards: (a) => ({ title: a.title, sub: a.awarder, when: date(a.date), text: a.summary }),
    publications: (p) => ({ title: p.name, sub: p.publisher, when: date(p.releaseDate), text: p.summary, url: p.url }),
    languages: (l) => ({ title: l.language, sub: l.fluency, level: level(l.fluency) }),
    references: (x) => ({ title: x.name, sub: x.position, text: x.reference, lines: [x.phone, x.email].filter(Boolean) }),
    custom: (x) => ({ title: x.title, sub: x.sub, where: x.where, when: range(x), text: x.text, points: x.points }),
  };
  const customOf = (r, key) => r.custom.find((c) => "custom:" + c.id === key);
  function items(r, key) {
    if (key.startsWith("custom:")) return ((customOf(r, key) || {}).items || []).map(SHAPE.custom);
    return SHAPE[key] ? r[key].map(SHAPE[key]) : [];
  }
  /* The keys of every section this resume can show, standard ones first. */
  const keysOf = (r) => Object.keys(SECTIONS).concat(arr(r.custom).filter((c) => c && c.id).map((c) => "custom:" + c.id));

  // the default drawings; a template restyles them with CSS or replaces them (item, draw)
  function item(it) {
    const pts = (it.points || []).length ? `<ul class="pts">${it.points.map((x) => `<li>${md(x)}</li>`).join("")}</ul>` : "";
    const title = it.url && !it.sub ? `<a href="${esc(href(it.url))}">${esc(it.title)}</a>` : esc(it.title);
    return `<div class="item">
      <div class="item-head keep">
        <div class="row1"><b class="t">${title}</b>${it.when ? `<span class="when">${it.when}</span>` : ""}</div>
        ${it.sub || it.where || it.note ? `<div class="row2"><span class="sub">${esc(it.sub)}</span><span class="where">${esc(join([it.where, it.note], " · "))}</span></div>` : ""}
      </div>
      ${it.text ? `<p class="text">${md(it.text)}</p>` : ""}${pts}
      ${(it.lines || []).map((l) => `<div class="line">${esc(l)}</div>`).join("")}
      ${(it.tags || []).length ? `<div class="tags">${it.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
    </div>`;
  }
  function skills(groups, style) {
    return groups.map((g) => {
      const n = level(g.level);
      if (style === "bars" && !g.keywords.length) return `<div class="skill keep"><span>${esc(g.name)}</span>${n ? bar(n) : ""}</div>`;
      if (style === "chips") return `<div class="grp keep">${g.name ? `<b>${esc(g.name)}</b>` : ""}<div class="tags">${g.keywords.map((k) => `<span>${esc(k)}</span>`).join("")}</div></div>`;
      if (style === "bars" || style === "lines") return `<div class="grp">${g.name ? `<b>${esc(g.name)}</b>` : ""}<ul class="plain">${g.keywords.map((k) => `<li>${esc(k)}</li>`).join("")}</ul></div>`;
      return `<div class="grp keep">${g.name ? `<b>${esc(g.name)}</b>` : ""}<span>${esc(g.keywords.join(ctx.joiner || " · "))}</span></div>`;
    }).join("");
  }
  h.items = items; h.item = item; h.skills = skills; h.join = join;

  function body(def, r, c) {
    const key = c.key, b = r.basics;
    if (def.draw && def.draw[key]) return def.draw[key](r, h, c);
    if (key === "summary") return b.summary ? `<p class="text">${md(b.summary)}</p>` : "";
    if (key === "contact") return contacts(b).map((x) => `<div class="c">${icon(x.kind)}<span>${link(x, x.text)}</span></div>`).join("");
    if (key === "skills") return skills(r.skills, def.skills || "groups");
    if (key === "interests") {
      const all = r.interests.flatMap((i) => (i.keywords.length ? [i.name + ": " + i.keywords.join(", ")] : [i.name])).filter(Boolean);
      return all.length ? `<div class="tags interests">${all.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : "";
    }
    if (key === "personal") return b.personal.map((f) => `<div class="fact"><b>${esc(f.label)}</b><span>${esc(f.value)}</span></div>`).join("");
    if (key === "declaration") {
      const d = r.declaration;
      return d.text ? `<p class="text">${md(d.text)}</p><div class="sign keep"><span>${esc(join([d.place && "Place: " + d.place, d.date && "Date: " + d.date], "   "))}</span><b>${esc(b.name)}</b></div>` : "";
    }
    const draw = def.item || item;
    if (key.startsWith("custom:")) {
      const cs = customOf(r, key);
      if (!cs) return "";
      if (cs.kind === "text") return cs.text ? `<p class="text">${md(cs.text)}</p>` : "";
      if (cs.kind === "list") return cs.lines.length ? `<ul class="pts">${cs.lines.map((l) => `<li>${md(l)}</li>`).join("")}</ul>` : "";
    }
    return items(r, key).map((it) => draw(it, h, c)).join("");
  }

  /* The sections in the order and columns this copy asks for: [{key, slot, title}]. */
  function plan(def, r, design) {
    const slots = def.slots || { main: [] }, names = Object.keys(slots);
    const rest = def.rest || names[names.length - 1], home = {};
    for (const n of names) for (const k of slots[n]) home[k] = n;
    const own = new Set(def.own || []), known = keysOf(r), user = arr(design.sections).filter((s) => s && known.includes(s.key));
    const base = names.flatMap((n) => slots[n]).filter((k) => known.includes(k));
    const order = user.length ? [...new Set(user.map((s) => s.key))] : base;
    for (const k of base.concat(known)) if (!order.includes(k)) order.push(k);
    const place = obj(design.place), out = [];
    for (const key of order) {
      const u = user.find((s) => s.key === key) || {};
      if (u.hidden || own.has(key)) continue;
      const cs = key.startsWith("custom:") ? customOf(r, key) : null;
      out.push({ key, slot: names.includes(place[key]) ? place[key] : home[key] || rest,
        title: str(u.title) || (cs ? cs.title : (def.titles || {})[key] || SECTIONS[key].title) });
    }
    return out;
  }

  function compose(def, r, design) {
    const html = {};
    for (const n of Object.keys(def.slots)) html[n] = "";
    for (const c of plan(def, r, design)) {
      const inner = body(def, r, c);
      if (!inner || !inner.trim()) continue;
      const head = def.heading ? def.heading(esc(c.title), c, h) : `<h2 class="head">${esc(c.title)}</h2>`;
      html[c.slot] += `<section class="sec sec-${c.key.replace(/:.*/, "")}" data-sec="${esc(c.key)}">${head}${inner}</section>`;
    }
    return def.frame(r, h, html);
  }

  // ------------------------------------------------------------------ render
  const BASE = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .doc { position: relative; margin: 0; overflow-wrap: break-word; }
    .doc a { color: inherit; text-decoration: none; }
    .doc li, .doc .keep { break-inside: avoid; }
    .doc .head { break-after: avoid; }
    .doc .ico { display: inline-block; vertical-align: middle; }
    .doc img.photo { display: block; object-fit: cover; }
    .doc.ph-round .photo { border-radius: 50%; }
    .doc.ph-square .photo { border-radius: 0; }
    .doc.ph-soft .photo { border-radius: 12%; }
  `;
  // what the default drawings need; :where() keeps it weaker than any template rule
  const V2 = `
    :where(.doc) { font-family: var(--font-body); }
    :where(.doc) :is(h1, h2, h3, p, ul) { margin: 0; }
    :where(.doc) :is(h1, h2, h3) { font-family: var(--font-head); }
    :where(.doc) .sec { margin-top: calc(22px * var(--sp)); }
    :where(.doc) .sec:first-child { margin-top: 0; }
    :where(.doc) .head { margin-bottom: calc(10px * var(--sp)); }
    :where(.doc) .item { margin-top: calc(13px * var(--sp)); }
    :where(.doc) .head + .item { margin-top: 0; }
    :where(.doc) .row1, :where(.doc) .row2 { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    :where(.doc) .when { white-space: nowrap; }
    :where(.doc) .pts { padding-left: 16px; margin-top: 4px; }
    :where(.doc) .pts li { margin-top: calc(2.5px * var(--sp)); }
    :where(.doc) .plain { list-style: none; padding: 0; }
    :where(.doc) .c { display: flex; gap: 9px; align-items: flex-start; margin-top: 7px; word-break: break-word; }
    :where(.doc) .c .ico { width: 12px; height: 12px; margin-top: .3em; flex: none; }
    :where(.doc) .grp { margin-top: calc(9px * var(--sp)); }
    :where(.doc) .head + .grp { margin-top: 0; }
    :where(.doc) .grp b { display: block; }
    :where(.doc) .tags { display: flex; flex-wrap: wrap; gap: 5px 6px; }
    :where(.doc) .skill { display: flex; align-items: center; gap: 12px; margin-top: 7px; }
    :where(.doc) .skill > span:first-child { flex: 0 0 46%; }
    :where(.doc) .bar { flex: 1; display: block; height: 4px; border-radius: 2px; background: rgba(128, 128, 128, .28); }
    :where(.doc) .bar i { display: block; height: 100%; border-radius: inherit; background: currentColor; }
    :where(.doc) .bar .w0 { width: 0%; } :where(.doc) .bar .w1 { width: 10%; } :where(.doc) .bar .w2 { width: 20%; } :where(.doc) .bar .w3 { width: 30%; } :where(.doc) .bar .w4 { width: 40%; } :where(.doc) .bar .w5 { width: 50%; } :where(.doc) .bar .w6 { width: 60%; } :where(.doc) .bar .w7 { width: 70%; } :where(.doc) .bar .w8 { width: 80%; } :where(.doc) .bar .w9 { width: 90%; } :where(.doc) .bar .w10 { width: 100%; }
    :where(.doc) .fact { display: flex; gap: 12px; margin-top: 4px; }
    :where(.doc) .fact b { flex: 0 0 34%; font-weight: 600; }
    :where(.doc) .sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 34px; }
    :where(.doc) { isolation: isolate; }
    :where(.doc)::before, :where(.doc)::after { position: absolute; z-index: -1; }
    :where(.doc.print)::before, :where(.doc.print)::after { position: fixed; }
    :where(.doc)::after { content: ""; inset: 0; z-index: -2; background: var(--paper, #fff); }
    :where(.doc) .col { padding-block: var(--mg); -webkit-box-decoration-break: clone; box-decoration-break: clone; }
    :where(.doc) .photo.initials { display: grid; place-items: center; font-family: var(--font-head); font-weight: 600; letter-spacing: .04em; }
  `;

  /* The font pairs a copy can choose instead of its template's own. */
  const FONTS = {
    inter: { name: "Inter", head: "Inter", body: "Inter" },
    poppins: { name: "Poppins + Lato", head: "Poppins", body: "Lato" },
    montserrat: { name: "Montserrat + Lato", head: "Montserrat", body: "Lato" },
    raleway: { name: "Raleway + Nunito Sans", head: "Raleway", body: "Nunito Sans" },
    plex: { name: "IBM Plex Sans", head: "IBM Plex Sans", body: "IBM Plex Sans" },
    playfair: { name: "Playfair + Lato", head: "Playfair Display", body: "Lato" },
    fraunces: { name: "Fraunces + Inter", head: "Fraunces", body: "Inter" },
    garamond: { name: "EB Garamond", head: "EB Garamond", body: "EB Garamond" },
    source: { name: "Source Serif", head: "Source Serif 4", body: "Source Serif 4" },
  };

  const templates = {};
  const sheets = new WeakMap();       // document or shadow root -> {sheet, key}
  const num = (v, lo, hi, dflt) => (typeof v === "number" && v >= lo && v <= hi ? v : dflt);

  /* The px width a copy's page is drawn at: the template's, narrower for larger text. */
  const widthOf = (def, design) => Math.round(def.width / num((design || {}).scale, 0.8, 1.3, 1));

  function layout(def, paperKey, design) {
    const paper = PAPER[paperKey] || PAPER.a4;
    const zoom = paper.w / widthOf(def, design);
    // v2 pages bleed to the paper's edge: their columns repeat this margin as padding on every page
    const margin = def.frame ? MARGIN * num((design || {}).margins, 0.6, 1.5, 1) : MARGIN;
    return {
      paper, zoom, margin,
      page: paper.h / zoom,                        // design px of one whole page
      first: (paper.h - margin) / zoom,            // design px of content that fit on page 1
      next: (paper.h - 2 * margin) / zoom,         // and on every later page
    };
  }

  /* Draw `resume` into `el`. mode "print" scales the page to the paper;
   * "screen" keeps the design width (the editor scales the preview instead).
   * The styles go to the document or shadow root `el` sits in, so a page can
   * hold several resumes, each in its own shadow root (see mount). */
  function render(el, resume, design, mode) {
    const def = templates[design.template];
    if (!def) throw new Error("no template " + design.template);
    const L = layout(def, design.paper, design), width = widthOf(def, design);
    const root = el.getRootNode();
    let s = sheets.get(root);
    if (!s) {
      s = { sheet: new CSSStyleSheet(), key: "" };
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, s.sheet];
      sheets.set(root, s);
    }
    const key = [def.id, design.paper, mode, def.css.length, width].join("|");
    el.style.minHeight = "";
    if (s.key !== key) {
      s.sheet.replaceSync(BASE + (def.frame ? V2 : EXTRA) + def.css + `
        ${def.frame ? `@page { size: ${L.paper.size}; margin: 0; }` : `
        @page { size: ${L.paper.size}; margin: ${MARGIN}px 0 ${MARGIN}px 0; }
        @page :first { margin-top: 0; }`}
        :host { all: initial; display: block; }
        .doc { width: ${width}px; ${def.frame ? "" : `min-height: ${Math.floor(L.first) - 2}px; background: #fff;`} }
        ${mode === "print" ? `.doc { zoom: ${L.zoom}; }` : ""}
      `);
      s.key = key;
    }
    const font = FONTS[design.font] || def.fonts || {};
    el.className = "doc tpl-" + def.id + (mode === "print" ? " print" : "") + (["round", "square", "soft"].includes(design.photoShape) ? " ph-" + design.photoShape : "");
    el.style.setProperty("--accent", design.accent || def.accent || "#2563eb");
    el.style.setProperty("--font-head", `"${font.head || "Inter"}", sans-serif`);
    el.style.setProperty("--font-body", `"${font.body || "Inter"}", sans-serif`);
    el.style.setProperty("--sp", num(design.spacing, 0.6, 1.6, 1));
    el.style.setProperty("--pad", num(design.margins, 0.6, 1.5, 1));
    el.style.setProperty("--mg", (L.margin / L.zoom).toFixed(2) + "px");
    const r = tidy(resume);
    ctx = { dateFmt: ["long", "short", "num", "year"].includes(design.dateFmt) ? design.dateFmt : "",
      fmt: def.frame ? def.dateFmt || "short" : "", sep: def.frame ? def.dateSep || " – " : "", noPhoto: design.photo === false,
      joiner: def.joiner };
    if (ctx.noPhoto) r.basics.image = "";
    for (const sec of arr(design.sections)) {            // a hidden section holds nothing, for templates of either kind
      if (!sec || !sec.hidden) continue;
      if (sec.key === "summary") r.basics.summary = "";
      else if (Array.isArray(r[sec.key])) r[sec.key] = [];
    }
    try {
      place(el, def.frame ? compose(def, r, design) : def.render(r, h));
      if (!def.frame) extras(el, def, r, design);
    } finally { ctx = {}; }
    if (def.frame && mode !== "print") fill(el, L);
    return L;
  }

  /* A template's HTML goes through an inert <template> first, so nothing in it loads or runs before the
   * parts no resume needs are gone: scripts, frames, meta refreshes, forms, event handlers and links that
   * are not web, mail or phone. Templates escape every field; this holds even if one forgets. */
  const DROP = "script,noscript,meta,link,base,style,iframe,frame,frameset,object,embed,applet,portal,form,input,button," +
    "textarea,select,option,video,audio,source,track,picture,set,animate,animateMotion,animateTransform,foreignObject";
  const SAFE_URL = /^(https?:|mailto:|tel:|#|data:image\/(png|jpeg|webp);base64,|data\/examples\/)/i;
  function place(el, html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    for (const n of t.content.querySelectorAll(DROP)) n.remove();
    for (const n of t.content.querySelectorAll("*")) {
      for (const a of [...n.attributes]) {
        const name = a.name.toLowerCase();
        if (name.startsWith("on") || name === "srcdoc" || name === "srcset" || name === "formaction" || name === "ping" ||
            ((name === "href" || name === "src" || name === "xlink:href" || name === "action" || name === "poster") &&
             !SAFE_URL.test(a.value.trim()))) n.removeAttribute(a.name);
      }
    }
    el.replaceChildren(t.content);
  }

  /* A v1 template draws a fixed set of sections (the first seven). Anything else the resume holds
   * (awards, volunteering, references, interests, personal details, a declaration, sections of the
   * person's own) is added at the end of its main column, dressed like the template's own sections:
   * the same wrapper and heading classes as its Experience section. Nothing changes without them. */
  const V1_DRAWS = new Set(["summary", "contact", "work", "education", "skills", "projects", "certificates", "languages"]);
  function extras(el, def, r, design) {
    const wanted = plan({ slots: { main: [] }, titles: def.titles }, r, design).filter((c) => !V1_DRAWS.has(c.key));
    const parts = wanted.map((c) => [c, body({}, r, c)]).filter(([, inner]) => inner && inner.trim());
    if (!parts.length) return;
    // the main column: of the columns holding headings (h2 or class "head"), the one with the most text
    const heads = [...el.querySelectorAll("h2, .head")].filter((n) => !n.parentElement.closest("h2, .head"));
    const wrapOf = (hd) => (hd.parentElement !== el && heads.filter((x) => hd.parentElement.contains(x)).length === 1 ? hd.parentElement : null);
    let column = el, head = null, most = -1;
    for (const hd of heads) {
      const col = (wrapOf(hd) || hd).parentElement;
      if (col.textContent.length > most) { most = col.textContent.length; column = col; head = hd; }
    }
    const wrap = head && wrapOf(head);
    const html = parts.map(([c, inner]) => {
      let hd = `<h2 class="head">${esc(c.title)}</h2>`;
      if (head) {                                  // the template's own heading, with this title in it
        const n = head.cloneNode(true);
        let t = n;
        while (t.children.length === 1) t = t.children[0];
        t.textContent = c.title;
        hd = n.outerHTML;
      }
      const tag = wrap ? wrap.tagName.toLowerCase() : "section";
      const cls = ((wrap ? wrap.getAttribute("class") || "" : "") + " extra").trim();
      return `<${tag} class="${esc(cls)}" data-sec="${esc(c.key)}">${hd}<div class="extra-body">${inner}</div></${tag}>`;
    });
    column.insertAdjacentHTML("beforeend", html.join(""));
  }

  /* What a v1 template's added sections need of the v2 defaults, only inside them (its own parts stay as they were). */
  const EXTRA = `
    :where(.extra-body) :is(p, ul) { margin: 0; }
    :where(.extra-body) .item { margin-top: 8px; }
    :where(.extra-body) .item:first-child { margin-top: 0; }
    :where(.extra-body) .row1, :where(.extra-body) .row2 { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    :where(.extra-body) .when { white-space: nowrap; }
    :where(.extra-body) .pts { padding-left: 16px; margin-top: 4px; }
    :where(.extra-body) .tags span + span::before { content: ", "; }
    :where(.extra-body) .grp b { display: block; }
    :where(.extra-body) .fact { display: flex; gap: 12px; margin-top: 3px; }
    :where(.extra-body) .fact b { flex: 0 0 34%; font-weight: 600; }
    :where(.extra-body) .sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; }
  `;

  /* On screen a v2 page is as tall as the whole pages it needs (print gets that from the paper). */
  function fill(el, L) {
    el.style.minHeight = "";
    const tall = el.offsetHeight;
    if (!tall) return;
    const pages = tall <= L.page + 1 ? 1 : 1 + Math.ceil((tall - L.margin / L.zoom - L.first - 1) / L.next);
    el.style.minHeight = Math.floor(L.first + (pages - 1) * L.next + L.margin / L.zoom) + "px";
  }

  /* A resume drawn inside `host`, in a shadow root of its own so the
   * template's styles stay inside it. Returns draw(resume, design) -> layout;
   * draw.doc is the drawn page. */
  function mount(host) {
    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    const doc = root.querySelector(".doc") || root.appendChild(document.createElement("div"));
    const draw = (resume, design) => render(doc, resume, design, "screen");
    draw.doc = doc;
    return draw;
  }

  window.Resume = {
    template(def) { templates[def.id] = def; },
    templates, render, mount, layout, tidy, h, SECTIONS, FONTS, keysOf, plan, width: widthOf,
  };
})();
