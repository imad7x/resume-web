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
 * Class "keep" on an element keeps it on one page; "head" keeps a heading
 * with what follows. Page margins and scaling are added here, not in templates.
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

  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  function date(d, fmt) {
    if (!d) return "";
    const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(String(d).trim());
    if (!m) return esc(d);                       // free text such as "Summer 2015"
    const y = m[1], mo = m[2] ? +m[2] : 0;
    if (!mo || fmt === "year") return y;
    if (fmt === "num") return String(mo).padStart(2, "0") + "/" + y;
    if (fmt === "short") return LONG[mo - 1].slice(0, 3) + " " + y;
    return LONG[mo - 1] + " " + y;
  }

  function range(item, opts) {
    const o = Object.assign({ fmt: "long", sep: " - ", present: "Present" }, opts);
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

  const h = { esc, md, date, range, location, contacts, icon, link };

  // ------------------------------------------------------------ tidy the data
  const str = (v) => (v == null ? "" : String(v).trim());
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  const arr = (v) => (Array.isArray(v) ? v : []);
  const filled = (o) => Object.values(o).some((v) => (Array.isArray(v) ? v.length : str(v)));
  const lines = (v) => arr(v).map(str).filter(Boolean);
  const entries = (v, fields, lists) => arr(v).map(obj).map((e) => {
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
        url: str(b.url), summary: str(b.summary),
        location: { city: str(loc.city), region: str(loc.region), countryCode: str(loc.countryCode) },
        profiles: entries(b.profiles, ["network", "username", "url"]),
      },
      work: entries(r.work, ["name", "position", "location", "url", "startDate", "endDate", "summary"], ["highlights"]),
      education: entries(r.education, ["institution", "studyType", "area", "location", "startDate", "endDate", "score"], ["courses"]),
      certificates: entries(r.certificates, ["name", "issuer", "date", "url"]),
      skills: entries(r.skills, ["name", "level"], ["keywords"]),
      projects: entries(r.projects, ["name", "description", "url", "startDate", "endDate"], ["highlights", "keywords"]),
      languages: entries(r.languages, ["language", "fluency"]),
    };
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
  `;

  const templates = {};
  const sheets = new WeakMap();       // document or shadow root -> {sheet, key}

  function layout(def, paperKey) {
    const paper = PAPER[paperKey] || PAPER.a4;
    const zoom = paper.w / def.width;
    return {
      paper, zoom,
      first: (paper.h - MARGIN) / zoom,            // design px of content that fit on page 1
      next: (paper.h - 2 * MARGIN) / zoom,         // and on every later page
    };
  }

  /* Draw `resume` into `el`. mode "print" scales the page to the paper;
   * "screen" keeps the design width (the editor scales the preview instead).
   * The styles go to the document or shadow root `el` sits in, so a page can
   * hold several resumes, each in its own shadow root (see mount). */
  function render(el, resume, design, mode) {
    const def = templates[design.template];
    if (!def) throw new Error("no template " + design.template);
    const L = layout(def, design.paper);
    const root = el.getRootNode();
    let s = sheets.get(root);
    if (!s) {
      s = { sheet: new CSSStyleSheet(), key: "" };
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, s.sheet];
      sheets.set(root, s);
    }
    const key = [def.id, design.paper, mode, def.css.length].join("|");
    if (s.key !== key) {
      s.sheet.replaceSync(BASE + def.css + `
        @page { size: ${L.paper.size}; margin: ${MARGIN}px 0 ${MARGIN}px 0; }
        @page :first { margin-top: 0; }
        :host { all: initial; display: block; }
        .doc { width: ${def.width}px; min-height: ${Math.floor(L.first) - 2}px; background: #fff; }
        ${mode === "print" ? `.doc { zoom: ${L.zoom}; }` : ""}
      `);
      s.key = key;
    }
    el.className = "doc tpl-" + def.id;
    el.style.setProperty("--accent", design.accent || def.accent || "#2563eb");
    el.innerHTML = def.render(tidy(resume), h);
    return L;
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
    templates, render, mount, layout, tidy, h,
  };
})();
