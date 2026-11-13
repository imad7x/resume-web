/* Import: turns a resume file of another kind into the JSON Resume shape the
 * editor uses, so it can be redrawn in any template.
 *
 *   Importer.read(file) -> {resume, report, design?}
 *
 * Files are read on the phone, nothing is uploaded:
 *   .json              JSON Resume, or a resume/backup exported from this app
 *   .pdf               text from pdf.js (lib/pdfjs); a scanned PDF goes through OCR
 *   .docx / .odt       the document XML, unzipped with DecompressionStream
 *   .rtf .html .txt .md
 *   images             OCR (Android only: window.Native.ocr, on-device text recognition)
 *
 * Every reader produces lines: {text, size, bold, bullet, heading, gap}; parse()
 * finds the sections by their headings and reads each one with rules for that
 * kind of section. A text line may hold several cells separated by tabs (a
 * title on the left, dates on the right).
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------- vocabulary
  const SECTION_WORDS = {
    summary: ["summary", "professional summary", "profile", "professional profile", "about", "about me", "objective", "research interests",
      "career objective", "career summary", "overview", "personal statement", "executive summary", "introduction",
      "summary of qualifications", "personal profile", "professional overview", "who i am"],
    work: ["experience", "work experience", "professional experience", "employment", "employment history", "work history",
      "career history", "relevant experience", "professional background", "career", "internships", "internship",
      "internship experience", "experience and internships", "work", "professional history", "positions held",
      "internships and experience", "academic appointments", "appointments", "academic experience", "teaching experience",
      "research experience", "clinical experience", "results and work history", "work history and results"],
    education: ["education", "academic background", "academics", "education and training", "qualifications",
      "academic qualifications", "educational qualifications", "educational background", "academic history", "schooling",
      "academic details", "educational details"],
    skills: ["skills", "technical skills", "core skills", "key skills", "core competencies", "competencies", "expertise",
      "areas of expertise", "skills and tools", "tools", "technologies", "tech stack", "stack", "skills summary", "strengths",
      "technical proficiencies", "it skills", "soft skills", "skill set", "skillset", "technical expertise", "tools and technologies",
      "key competencies", "professional skills", "computer skills", "abilities", "clinical skills", "what i do"],
    projects: ["projects", "personal projects", "key projects", "academic projects", "selected projects", "side projects",
      "portfolio", "open source", "project experience", "notable projects", "publications", "research"],
    certificates: ["certifications", "certificates", "certification", "licenses", "licenses and certifications",
      "certifications and licenses", "licences and registrations", "licenses and registrations", "bar admissions", "courses", "training", "awards", "honors", "honours", "achievements",
      "awards and honors", "awards and achievements", "accomplishments", "grants and awards", "certifications and awards", "certificates and awards",
      "certifications and awards", "professional development", "trainings", "licences"],
    languages: ["languages", "language skills", "language proficiency", "languages known", "spoken languages"],
    volunteer: ["volunteer", "volunteering", "volunteer experience", "community", "community involvement", "leadership",
      "extracurricular", "extracurricular activities", "activities", "leadership and activities", "positions of responsibility"],
    interests: ["interests", "hobbies", "hobbies and interests", "personal interests"],
    references: ["references", "referees"],
    contact: ["contact", "contact information", "contact details", "personal details", "personal information", "details",
      "contact me", "info"],
  };
  const HEADINGS = new Map();
  for (const [key, words] of Object.entries(SECTION_WORDS)) for (const w of words) HEADINGS.set(w, key);
  const KEYWORDS = [["experience", "work"], ["employment", "work"], ["education", "education"], ["skill", "skills"],
    ["project", "projects"], ["certif", "certificates"], ["award", "certificates"], ["language", "languages"],
    ["summary", "summary"], ["profile", "summary"], ["objective", "summary"], ["volunteer", "volunteer"],
    ["interest", "interests"], ["hobbies", "interests"], ["competenc", "skills"], ["achievement", "certificates"]];

  const TITLE_WORDS = /\b(engineer|developer|manager|intern|internship|analyst|lead|designer|consultant|director|specialist|architect|officer|associate|head|president|vp|founder|co-founder|administrator|admin|coordinator|scientist|technician|assistant|executive|representative|teacher|professor|lecturer|nurse|accountant|recruiter|writer|editor|researcher|programmer|sre|devops|owner|partner|advisor|adviser|strategist|supervisor|trainee|apprentice|fellow|tutor|chef|operator|agent|clerk|cashier|driver|attorney|lawyer|paralegal|physician|doctor|pharmacist|therapist|coach|instructor|volunteer|member|chair|chairperson|secretary|treasurer|contractor|freelancer|freelance|principal|staff|junior|senior|sr|jr|cto|ceo|cfo|coo|cio|mentor|guide|planner|producer|artist|photographer|marketer|salesperson|technologist|investigator|auditor|controller|banker|broker|buyer|merchandiser|teller|receptionist|steward|pilot|mechanic|electrician|welder|surveyor|inspector|officer)\b/i;
  const ORG_WORDS = /\b(inc|ltd|llc|llp|plc|pvt|limited|corp|corporation|co\.|company|technologies|technology|tech|solutions|systems|labs?|group|bank|university|college|institute|school|hospital|clinic|services|consulting|consultancy|studios?|agency|gmbh|ag|sa|bv|pty|foundation|partners|holdings|global|international|software|networks|media|ventures|capital|industries|enterprises|associates|organization|organisation|council|ministry|department|government|academy|bureau|club|society|trust|ngo)\b/i;
  const DEGREE = /\b(bachelor'?s?|master'?s?|b\.?\s?sc|m\.?\s?sc|b\.?\s?s\.?|m\.?\s?s\.?|b\.?\s?a\.?|m\.?\s?a\.?|mba|ph\.?\s?d|doctorate|b\.?\s?tech|m\.?\s?tech|b\.?\s?e\.?|m\.?\s?e\.?|bca|mca|bba|b\.?\s?com|m\.?\s?com|diploma|associate'?s?|high school|secondary|higher secondary|hsc|ssc|sslc|puc|cbse|icse|a-levels?|gcse|degree|b\.?\s?eng|m\.?\s?eng|bfa|mfa|llb|llm|md|mbbs|bds|b\.?\s?pharm|m\.?\s?pharm|b\.?\s?arch|postgraduate|undergraduate|graduate|certificate in|class (x|xii|10|12)|grade (10|12)|10th|12th)\b/i;
  const SCHOOL = /\b(university|universit[äé]t|college|institute|institution|school|academy|polytechnic|iit|nit|iiit|iim|campus|faculty|conservatory|seminary)\b/i;
  const FLUENCY = /\b(native|mother tongue|bilingual|fluent|fluency|full professional|professional working|professional|working proficiency|conversational|basic|intermediate|advanced|beginner|elementary|limited|proficient|good|excellent|[abc][12])\b/i;
  const SPOKEN = /\b(english|spanish|french|german|hindi|mandarin|chinese|japanese|korean|arabic|portuguese|russian|italian|bengali|bangla|urdu|tamil|telugu|kannada|malayalam|marathi|gujarati|punjabi|odia|dutch|swedish|norwegian|danish|finnish|polish|turkish|greek|hebrew|persian|farsi|thai|vietnamese|indonesian|malay|tagalog|filipino|swahili|czech|hungarian|romanian|ukrainian|cantonese|catalan|serbian|croatian|bulgarian|slovak|nepali|sinhala|sign language)\b/i;
  const SMALL = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with", "via", "&"]);

  const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
  const DATE = `(?:${MONTH}\\s*[,']?\\s*(?:19|20)?\\d{2}|\\d{1,2}\\s*[/.-]\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2}\\s*[/.-]\\s*\\d{1,2}(?!\\d)|(?:spring|summer|fall|autumn|winter)\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2})`;
  const PRESENT = "(present|current|currently|now|today|ongoing|till date|to date|date|continuing)";
  const RANGE_RE = new RegExp(`(?:(?:from|since)\\s+)?(?<s>${DATE})\\s*(?:-|–|—|to|until|till|through|→|~|‐|−)\\s*(?<e>${DATE}|${PRESENT})`, "i");
  const SINCE_RE = new RegExp(`\\b(?:since|from)\\s+(${DATE})\\b`, "i");
  const DATE_RE = new RegExp(`(?<![\\d/])(${DATE})(?![\\d/])`, "i");
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  const BULLET_RE = /^\s*(?:[•◦▪▫▸►‣⁃∙●○■□◆◇➢➤➣✓✔✗→»·*]|[-–—](?=\s)|\(?\d{1,2}[.)](?=\s)|[a-z][.)](?=\s))\s*/;
  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const PHONE_RE = /(?:\+\s?\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d[\d\s.-]{6,15}\d/;
  const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|me|co|in|uk|ai|app|xyz|site|page|tech|info|blog|design|portfolio|us|ca|de|eu|au|so|gg|ly|sh|to|cc)\b(?:\/[^\s,|•·]*)?/i;

  // --------------------------------------------------------------- helpers
  const clean = (s) => String(s || "").replace(/[   ]/g, " ").replace(/[​-‍﻿]/g, "")
    .replace(/[ \f\v]+/g, " ").replace(/ *\t */g, "\t").trim();
  const words = (s) => String(s).split(/\s+/).filter(Boolean);
  const letters = (s) => (String(s).match(/\p{L}/gu) || []).length;
  const isUpper = (s) => letters(s) >= 2 && s === s.toUpperCase() && s !== s.toLowerCase();
  const norm = (s) => clean(s).toLowerCase().replace(/&/g, " and ").replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();

  /* "SENIOR SITE RELIABILITY ENGINEER" -> "Senior Site Reliability Engineer"; short words that look like acronyms stay. */
  function titleCase(s) {
    if (!isUpper(s)) return s;
    return s.toLowerCase().split(/(\s+|-|\/)/).map((w, i) => {
      if (!/\p{L}/u.test(w)) return w;
      const up = w.toUpperCase();
      if (/^([a-z]\.){1,4}[a-z]?\.?$/.test(w)) return up;            // B.S., M.B.A.
      if (i > 0 && SMALL.has(w)) return w;
      if (w.length <= 3 && !SMALL.has(w) && !/^(mr|mrs|ms|dr|jr|sr|ltd|inc|co)$/.test(w) && !/[aeiou]/.test(w.slice(1))) return up;
      if (/^(aws|gcp|ibm|sql|api|ui|ux|qa|hr|it|ai|ml|seo|crm|erp|sap|ceo|cto|cfo|coo|vp|sre|bsc|msc|mba|phd|cka|ckad|pmp|cpa|cfa|usa|uk|uae|nyc|ios)$/.test(w)) return up;
      return w[0].toUpperCase() + w.slice(1);
    }).join("");
  }

  function parseDate(s) {
    if (!s) return "";
    const t = clean(s).toLowerCase().replace(/[,']/g, " ").replace(/\s+/g, " ");
    if (new RegExp("^" + PRESENT + "$", "i").test(t)) return "";
    let m = new RegExp("^" + MONTH + "\\s*((?:19|20)?\\d{2})$", "i").exec(t);
    if (m) {
      const mo = MONTHS.indexOf(m[1].slice(0, 3)) + 1;
      let y = m[2];
      if (y.length === 2) y = (+y > 50 ? "19" : "20") + y;
      return y + "-" + String(mo).padStart(2, "0");
    }
    m = /^(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})$/.exec(t);
    if (m && +m[1] >= 1 && +m[1] <= 12) return m[2] + "-" + m[1].padStart(2, "0");
    m = /^((?:19|20)\d{2})\s*[/.-]\s*(\d{1,2})$/.exec(t);
    if (m && +m[2] >= 1 && +m[2] <= 12) return m[1] + "-" + m[2].padStart(2, "0");
    m = /^(spring|summer|fall|autumn|winter)\s+((?:19|20)\d{2})$/.exec(t);
    if (m) return m[2] + "-" + { spring: "03", summer: "06", fall: "09", autumn: "09", winter: "12" }[m[1]];
    m = /^((?:19|20)\d{2})$/.exec(t);
    if (m) return m[1];
    return "";
  }

  /* Pull a date range (or one date) out of a text: {start, end, rest, found}. */
  function takeDates(text, single) {
    let m = RANGE_RE.exec(text);
    if (m) {
      const end = parseDate(m.groups.e);
      return { start: parseDate(m.groups.s), end, rest: strip(text, m), found: true, present: !end };
    }
    m = SINCE_RE.exec(text);
    if (m) return { start: parseDate(m[1]), end: "", rest: strip(text, m), found: true, present: true };
    if (single) {
      m = DATE_RE.exec(text);
      if (m && parseDate(m[1])) return { start: "", end: parseDate(m[1]), rest: strip(text, m), found: true, single: true };
    }
    return { start: "", end: "", rest: text, found: false };
  }
  const strip = (text, m) => clean(text.slice(0, m.index) + "\t" + text.slice(m.index + m[0].length))
    .replace(/\(\s*\)|\[\s*\]/g, "").replace(/(^[\t\s|│,·•–—-]+|[\t\s|│,·•–—(-]+$)/g, "").trim();

  /* Split a header line into its parts: "Engineer | Acme, Berlin" -> ["Engineer", "Acme, Berlin"]. */
  const splitParts = (s) => clean(s).split(/\t|\s+[|│·•◆▪]\s+|\s+[–—]\s+|\s+-\s+|\s+@\s+|\s+at\s+(?=\p{Lu})/u)
    .map((x) => x.replace(/^[|│·•,\s]+|[|│·•,\s]+$/g, "").trim()).filter(Boolean);

  function looksLikeLocation(s) {
    const t = clean(s).replace(/^\(|\)$/g, "");
    if (/^(remote|hybrid|on-?site|work from home|wfh)\b/i.test(t) || /\((remote|hybrid|on-?site)/i.test(t)) return true;
    if (/\d|@/.test(t) || words(t).length > 6 || DEGREE.test(t)) return false;
    const parts = t.split(/\s*,\s*/);
    if (parts.length < 2 || parts.length > 3) return false;
    return parts.every((p) => /^\p{Lu}[\p{L}.' -]*$/u.test(p) && words(p).length <= 3) && !TITLE_WORDS.test(t) && !ORG_WORDS.test(t);
  }

  // ------------------------------------------------------------- read files
  const EXT = (name) => (/\.([a-z0-9]+)$/i.exec(name || "") || [])[1]?.toLowerCase() || "";

  async function read(file) {
    const ext = EXT(file.name), type = file.type || "";
    const buf = new Uint8Array(await file.arrayBuffer());
    const head = new TextDecoder("latin1").decode(buf.slice(0, 8));
    let lines, source = ext.toUpperCase() || "file", extra = {};
    if (ext === "json" || type === "application/json") {
      return fromJson(new TextDecoder().decode(buf));
    } else if (head.startsWith("%PDF") || ext === "pdf") {
      source = "PDF";
      const out = await readPdf(buf);
      lines = out.lines;
      extra.ocr = out.ocr;
    } else if (head.startsWith("PK")) {
      const zip = await unzip(buf);
      if (zip["word/document.xml"]) { source = "Word document"; lines = docxLines(zip); extra.links = docxLinks(zip); }
      else if (zip["content.xml"]) { source = "OpenDocument"; lines = odtLines(zip["content.xml"]); }
      else throw new Error("That zip file isn’t a Word or OpenDocument file");
    } else if (/^\{\\rtf/.test(head)) {
      source = "RTF"; lines = textLines(rtfText(new TextDecoder("latin1").decode(buf)));
    } else if (/^image\//.test(type) || /^(png|jpe?g|webp|heic|heif|bmp|gif)$/.test(ext)) {
      source = "photo";
      lines = await ocrImage(file);
      extra.ocr = true;
    } else if (ext === "doc" || head.startsWith("\xd0\xcf\x11\xe0")) {
      throw new Error("Old .doc files can’t be read. Save it as .docx or PDF first.");
    } else {
      const text = decode(buf);
      if (/^\s*[{[]/.test(text)) return fromJson(text);
      if (/<(html|body|div|p|h1)\b/i.test(text)) { source = "web page"; lines = htmlLines(text); }
      else { source = ext === "md" ? "Markdown" : "text file"; lines = textLines(text, ext === "md"); }
    }
    const resume = parse(lines, extra);
    return { resume, report: report(resume, source, extra) };
  }

  function decode(buf) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { return new TextDecoder("windows-1252").decode(buf); }
  }

  function fromJson(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("That file isn’t valid JSON"); }
    if (obj && Array.isArray(obj.resumes)) return { backup: obj };
    let resume = obj, design;
    if (obj && obj.resume && (obj.design || obj.title)) { resume = obj.resume; design = obj.design; }
    else if (obj && obj.meta && obj.meta.resumeApp) {
      design = obj.meta.resumeApp;
      resume = Object.assign({}, obj);
      resume.meta = Object.assign({}, obj.meta);
      delete resume.meta.resumeApp;
    }
    if (!resume || typeof resume !== "object" || !(resume.basics || resume.work)) throw new Error("That JSON doesn’t look like a resume");
    delete resume.$schema;
    // older JSON Resume files keep the location as a string or the company as "company"
    for (const w of resume.work || []) if (w && !w.name && w.company) w.name = w.company;
    if (resume.basics && typeof resume.basics.location === "string") resume.basics.location = { city: resume.basics.location };
    for (const v of resume.volunteer || []) (resume.work = resume.work || []).push({ position: v.position, name: v.organization,
      startDate: v.startDate, endDate: v.endDate, summary: v.summary, highlights: v.highlights || [] });
    for (const a of resume.awards || []) (resume.certificates = resume.certificates || []).push({ name: a.title, issuer: a.awarder, date: a.date });
    return { resume, design, report: report(resume, "JSON Resume file", {}) };
  }

  // ---- PDF
  let pdfjs = null;
  async function loadPdfjs() {
    if (pdfjs) return pdfjs;
    const base = new URL("lib/pdfjs/", document.baseURI).href;
    pdfjs = await import(base + "pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
    return pdfjs;
  }

  async function readPdf(buf) {
    const lib = await loadPdfjs();
    const pdf = await lib.getDocument({ data: buf, isEvalSupported: false, useSystemFonts: false,
      standardFontDataUrl: null, disableFontFace: true }).promise;
    const pages = [];
    let chars = 0;
    for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      let fonts = {}, markers = [];
      try {
        const ops = await page.getOperatorList();
        markers = pathMarkers(lib, ops);
        respace(lib, ops, tc.items);
        for (const it of tc.items) {
          if (!it.fontName || fonts[it.fontName] !== undefined) continue;
          let f = null;
          try { f = page.commonObjs.get(it.fontName); } catch (e) { /* not loaded */ }
          const name = (f && f.name) || "";
          fonts[it.fontName] = { name: name.replace(/^[A-Z]{6}\+/, ""), bold: !!(f && (f.bold || f.black))
            || /bold|black|heavy|semibold|demi|[-,]bd\b|w[6-9]00/i.test(name) };
        }
      } catch (e) { fonts = {}; }
      boldByWidth(tc.items, fonts);
      const items = tc.items.filter((it) => it.str).map((it) => {
        const [a, b, c, d, e, f] = it.transform;
        const size = Math.hypot(c, d) || Math.abs(d) || it.height || 10;
        chars += it.str.trim().length;
        return { text: it.str, x0: e, x1: e + (it.width || size * it.str.length * .5), y: f, size,
          bold: !!(fonts[it.fontName] || {}).bold };
      });
      pages.push({ items, markers, width: vp.width, height: vp.height, page });
    }
    if (chars < 40 * pages.length && root.Native && root.Native.ocr) {     // a scan: pictures of text
      const lines = [];
      for (const p of pages) lines.push(...await ocrCanvas(await pageCanvas(p.page)));
      return { lines, ocr: true };
    }
    if (chars < 20) throw new Error("This PDF has no text in it (it’s probably a scan). Try a photo of the page instead.");
    return { lines: layoutLines(pages), ocr: false, pages };
  }

  async function pageCanvas(page) {
    const vp = page.getViewport({ scale: 2.2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas;
  }

  /* Small filled shapes - the bullets of a list are drawn, not written,
   * by most PDF makers - as their centres in page space. */
  function pathMarkers(lib, ops) {
    const O = lib.OPS;
    const mul = (m1, m2) => [m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1], m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3], m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]];
    const ap = (x, y, m) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
    const out = [], stack = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i], args = ops.argsArray[i];
      if (fn === O.save) stack.push(ctm);
      else if (fn === O.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === O.transform) ctm = mul(ctm, args);
      else if (fn === O.constructPath) {
        const mm = args[args.length - 1];
        if (!mm || mm.length < 4) continue;
        const p1 = ap(mm[0], mm[1], ctm), p2 = ap(mm[2], mm[3], ctm);
        const w = Math.abs(p2[0] - p1[0]), h = Math.abs(p2[1] - p1[1]);
        if (w <= 6.5 && h <= 6.5 && w + h >= 1.2 && w < 9 * Math.max(h, .5)) out.push({ x: (p1[0] + p2[0]) / 2, y: (p1[1] + p2[1]) / 2 });
      }
    }
    return out;
  }

  /* pdf.js returns letter-spaced text as "S E N I O R S I T E", losing the
   * real spaces; the drawing operations still have them. */
  function respace(lib, ops, items) {
    const spacedOut = (t) => { const tk = t.trim().split(" "); return tk.length >= 4 && tk.filter((x) => x.length === 1).length >= tk.length * 0.7; };
    const spaced = items.filter((it) => spacedOut(it.str));
    if (!spaced.length) return;
    const O = lib.OPS, runs = [];
    let cur = "";
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn === O.beginText) cur = "";
      else if (fn === O.endText) runs.push(cur);
      else if (fn === O.showText || fn === O.showSpacedText) {
        for (const g of ops.argsArray[i][0] || []) if (g && typeof g === "object") cur += g.unicode || "";
      }
    }
    for (const it of spaced) {
      const want = it.str.replace(/\s+/g, "").toLowerCase();
      let done = false;
      for (const run of runs) {
        const flat = run.replace(/\s+/g, "").toLowerCase();
        const at = flat.indexOf(want);
        if (at < 0) continue;
        let n = 0, from = -1, to = run.length;
        for (let k = 0; k < run.length; k++) {
          if (/\s/.test(run[k])) continue;
          if (n === at) from = k;
          n++;
          if (n === at + want.length) { to = k + 1; break; }
        }
        if (from >= 0) {
          const t = run.slice(from, to).replace(/\s+/g, " ");
          it.str = t.toLowerCase() === t && it.str !== it.str.toLowerCase() ? t.toUpperCase() : t;
          done = true;
          break;
        }
      }
      if (!done) it.str = it.str.replace(/ /g, "");          // at least a whole word
    }
  }

  /* Variable fonts print every weight under one name; the bolder cuts of a
   * font are the ones whose letters run wider at the same size. */
  function boldByWidth(items, fonts) {
    const stat = {};
    for (const it of items) {
      const f = fonts[it.fontName];
      if (!f || !it.str || !it.width) continue;
      const lower = (it.str.match(/[a-z]/g) || []).length;
      if (lower < it.str.replace(/\s/g, "").length * 0.8 || lower < 3) continue;
      const size = Math.hypot(it.transform[2], it.transform[3]) || 10;
      const s = stat[it.fontName] || (stat[it.fontName] = { w: 0, c: 0 });
      s.w += it.width; s.c += it.str.length * size;
    }
    const groups = {};
    for (const [id, s] of Object.entries(stat)) {
      if (s.c < 40) continue;
      const base = fonts[id].name.replace(/[-,](regular|medium|light|book|roman)$/i, "");
      (groups[base] = groups[base] || []).push([id, s.w / s.c]);
    }
    for (const list of Object.values(groups)) {
      if (list.length < 2 || list.some(([id]) => fonts[id].bold)) continue;
      const min = Math.min(...list.map(([, r]) => r));
      for (const [id, r] of list) if (r > min * 1.035) fonts[id].bold = true;
    }
  }

  /* Positioned text (PDF items or OCR lines) -> reading-order lines.
   * Items on one baseline make a row; a wide gap inside a row becomes a tab.
   * A page with two columns of text is read column by column. */
  function layoutLines(pages) {
    const out = [];
    const repeated = repeatedEdges(pages);
    let lastGutter = 0, mainLeft = null, later = [];
    // a two-column resume runs on: page 1's main column, page 2's main column, … then the side columns
    const flush = () => { for (const [b, pi] of later) emit(b, pi); later = []; };
    pages.forEach((pg, pi) => {
      const rows = toRows(pg.items);
      const segs = [];
      for (const r of rows) for (const s of r.segs) segs.push(s);
      let gutter = findGutter(segs, pg.width);
      // a later page of a two-column resume may have too little text to tell on its own
      if (!gutter && lastGutter && segs.length) {
        const cross = segs.filter((s) => s.x0 < lastGutter - 2 && s.x1 > lastGutter + 2).length;
        const l = segs.some((s) => s.x1 <= lastGutter + 2), r2 = segs.some((s) => s.x0 >= lastGutter - 2);
        // or the side column has ended and only the main one runs on
        const onMain = mainLeft !== null && segs.every((s) => (mainLeft ? s.x1 <= lastGutter + 2 : s.x0 >= lastGutter - 2));
        if ((cross <= segs.length * 0.12 && l && r2) || onMain) gutter = lastGutter;
      }
      if (gutter) lastGutter = gutter;
      let order, after = [];
      if (gutter) {
        const crosses = (s) => s.x0 < gutter - 2 && s.x1 > gutter + 2;
        const left = segs.filter((s) => !crosses(s) && s.x1 <= gutter + 2);
        const right = segs.filter((s) => !crosses(s) && s.x0 >= gutter - 2);
        const full = segs.filter(crosses);
        const colTop = Math.max(...left.map((s) => s.y), ...right.map((s) => s.y));
        const top = full.filter((s) => s.y > colTop), bottom = full.filter((s) => s.y <= colTop);
        const asRows = (list) => toRows(list.flatMap((s) => s.items));
        // the wider column is usually the main one; read it first (the first page decides for the pages after it)
        const lw = left.reduce((n, s) => n + s.text.length, 0), rw = right.reduce((n, s) => n + s.text.length, 0);
        if (mainLeft === null) mainLeft = lw >= rw;
        const cols = mainLeft ? [left, right] : [right, left];
        order = [asRows(top), asRows(cols[0])];
        after = [asRows(cols[1]), asRows(bottom)];
      } else {
        flush();
        mainLeft = null;
        order = sideBySide(rows);
      }
      for (const block of order) emit(block, pi);
      for (const block of after) later.push([block, pi]);
    });
    flush();

    function emit(block, pi) {
      const pg = pages[pi];
      if (!block.length) return;
      for (const r of block) {
        r.marker = (pg.markers || []).some((m) => m.x < r.x0 - 0.3 && m.x > r.x0 - r.size * 2.6
          && Math.abs(m.y - (r.y + r.size * 0.33)) < r.size * 0.6);
      }
      const right = percentile(block.map((r) => r.x1), .9);
      const leftEdge = Math.min(...block.map((r) => r.x0));
      let prev = null;
      for (const r of block) {
        // a section name in a left margin, on the same row as the section's first line
        if (r.segs.length > 1 && HEADINGS.has(norm(r.segs[0].text))) {
          const h = r.segs.shift();
          out.push({ text: h.text, size: h.size || r.size, bold: h.boldChars > h.chars * 0.6, x0: h.x0, x1: h.x1, y: r.y, right: h.x1, left: h.x0, page: pi, gap: 3, tabs: false });
          r.x0 = r.segs[0].x0;
        }
        const text = r.segs.map((s) => s.text).join("\t");
        if (repeated.has(norm(text)) || /^(page\s*)?\d{1,2}(\s*(of|\/)\s*\d{1,2})?$/i.test(text.trim())) continue;
        const line = { text, size: r.size, bold: r.bold, x0: r.x0, x1: r.x1, y: r.y, right, left: leftEdge, page: pi,
          gap: prev ? (prev.y - r.y) / r.size : 0, tabs: r.segs.length > 1, bullet: r.marker };
        out.push(line);
        prev = line;
      }
      out.push({ text: "", page: pi, gap: 9 });         // a block ends: never join across it
    }
    return joinWrapped(out);
  }

  /* Sections set side by side ("Education | Certifications | Languages" on
   * one row of headings): each becomes its own block, read one after another. */
  function sideBySide(rows) {
    const blocks = [];
    let rest = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.segs.length < 2 || !r.segs.every((sg) => HEADINGS.has(norm(sg.text)))) { rest.push(r); continue; }
      // a heading often has a bar or icon before it: its column starts a little to the left
      const edges = r.segs.map((sg, k) => (k ? sg.x0 - r.size * 1.6 : sg.x0));
      const cols = edges.map(() => []);
      let j = i;
      for (; j < rows.length; j++) {
        const row = rows[j];
        const crosses = row.segs.some((sg) => edges.some((e, k) => k > 0 && sg.x0 < e - 3 && sg.x1 > e + 3));
        if (j > i && crosses) break;
        const parts = edges.map(() => []);
        for (const sg of row.segs) {
          let k = edges.length - 1;
          while (k > 0 && sg.x0 < edges[k] - 3) k--;
          parts[k].push(sg);
        }
        parts.forEach((p, k) => {
          if (p.length) cols[k].push({ y: row.y, size: row.size, bold: row.bold, segs: p, x0: p[0].x0, x1: Math.max(...p.map((x) => x.x1)) });
        });
      }
      if (rest.length) blocks.push(rest);
      rest = [];
      blocks.push(...cols.filter((c) => c.length));
      i = j - 1;
    }
    if (rest.length) blocks.push(rest);
    return blocks;
  }

  function toRows(items) {
    const sorted = items.filter((i) => i.text.trim() || i.x1 > i.x0).sort((a, b) => b.y - a.y || a.x0 - b.x0);
    const rows = [];
    for (const it of sorted) {
      const row = rows.find((r) => Math.abs(r.y - it.y) < Math.min(r.size, it.size) * 0.45
        && Math.max(r.size, it.size) / Math.min(r.size, it.size) < 1.45);
      if (row) row.items.push(it); else rows.push({ y: it.y, size: it.size, items: [it] });
    }
    for (const r of rows) {
      r.items.sort((a, b) => a.x0 - b.x0);
      const solid = r.items.filter((i) => i.text.trim());
      if (!solid.length) { r.segs = []; continue; }
      const bySize = {};
      for (const i of solid) bySize[i.size.toFixed(1)] = (bySize[i.size.toFixed(1)] || 0) + i.text.trim().length;
      r.size = +Object.entries(bySize).sort((a, b) => b[1] - a[1])[0][0];
      r.x0 = solid[0].x0;
      r.x1 = Math.max(...solid.map((i) => i.x1));
      r.segs = [];
      let cur = null, space = false;
      // letter-spaced text comes one letter per item: only a real gap is a space there
      const singles = solid.filter((i) => i.text.trim().length === 1).length > solid.length * 0.6 && solid.length > 3;
      const fake = percentile(r.items.filter((i) => !i.text.trim()).map((i) => i.x1 - i.x0), 0.5);
      for (const it of r.items) {
        // pdf.js fills letter-spacing with thin fake spaces; a real one is wider
        if (!it.text.trim()) { if (it.x1 - it.x0 >= Math.max(r.size * 0.2, singles ? fake * 1.6 : 0)) space = true; continue; }
        const gap = cur ? it.x0 - cur.x1 : 0;
        const ratio = cur ? Math.max(it.size, cur.size) / Math.min(it.size, cur.size) : 1;
        const glyph = cur && /^[•◦▪▸►‣●○■◆➢➤✓✔·*–-]$/.test(cur.text.trim());
        if (cur && ((gap < it.size * 1.6 && ratio < 1.45) || glyph)) {
          const sp = space || gap > it.size * (singles ? 0.5 : 0.12);
          cur.text += (sp && !/\s$/.test(cur.text) && !/^\s/.test(it.text) ? " " : "") + it.text;
          space = false;
          cur.x1 = Math.max(cur.x1, it.x1);
          cur.items.push(it);
          cur.boldChars += it.bold ? it.text.length : 0;
          cur.chars += it.text.length;
        } else {
          space = false;
          cur = { text: it.text, x0: it.x0, x1: it.x1, y: r.y, size: it.size, items: [it], boldChars: it.bold ? it.text.length : 0, chars: it.text.length };
          r.segs.push(cur);
        }
      }
      for (const s of r.segs) s.text = clean(s.text);
      r.segs = r.segs.filter((s) => s.text);
      r.bold = r.segs.reduce((n, s) => n + s.boldChars, 0) > 0.6 * r.segs.reduce((n, s) => n + s.chars, 0);
    }
    return rows.filter((r) => r.segs.length).sort((a, b) => b.y - a.y);
  }

  /* An x position that splits the page into two columns of real text. */
  function findGutter(segs, width) {
    if (segs.length < 12) return 0;
    const total = segs.reduce((n, s) => n + s.text.length, 0);
    let best = 0, bestScore = Infinity;
    for (let x = width * 0.22; x <= width * 0.78; x += 3) {
      let cross = 0, l = 0, r = 0, ln = 0, rn = 0;
      for (const s of segs) {
        if (s.x0 < x - 2 && s.x1 > x + 2) cross++;
        else if (s.x1 <= x + 2) { l += s.text.length; ln++; } else { r += s.text.length; rn++; }
      }
      // a narrow sidebar (contact, education) can hold far less text than the main column, if it has enough lines
      if (l < total * (ln >= 8 ? 0.04 : 0.15) || r < total * (rn >= 8 ? 0.04 : 0.15) || ln < 5 || rn < 5) continue;
      if (cross < bestScore) { bestScore = cross; best = x; }
    }
    if (!best || bestScore > segs.length * 0.12) return 0;
    // headings or lines running across the split, between the columns' first and last lines: one column
    const L0 = segs.filter((s) => s.x1 <= best + 2), R0 = segs.filter((s) => s.x0 >= best - 2);
    const top = Math.min(Math.max(...L0.map((s) => s.y)), Math.max(...R0.map((s) => s.y)));
    const bottom = Math.max(Math.min(...L0.map((s) => s.y)), Math.min(...R0.map((s) => s.y)));
    if (segs.filter((s) => s.x0 < best - 2 && s.x1 > best + 2 && s.y < top - 1 && s.y > bottom + 1).length >= 2) return 0;
    // real columns are left-aligned: most of their lines start at about the same x
    const aligned = (list) => {
      const tol = width * 0.04;          // contact lines often sit a little in, after an icon
      let most = 0;
      for (const a of list) most = Math.max(most, list.filter((b) => b.x0 >= a.x0 - 0.5 && b.x0 <= a.x0 + tol).length);
      return most >= list.length * 0.55;
    };
    if (!aligned(L0) || !aligned(R0)) return 0;
    // section names in a left margin are not a column of their own
    if (L0.filter((s) => HEADINGS.has(norm(s.text))).length > L0.length * 0.5) return 0;
    // a column of dates beside a column of text is one column, not two
    const left = segs.filter((s) => s.x1 <= best + 2);
    const dateish = left.filter((s) => RANGE_RE.test(s.text) || DATE_RE.test(s.text) && s.text.length < 24).length;
    if (dateish > left.length * 0.5) return 0;
    return best;
  }

  /* Lines that repeat at the same spot on several pages (headers, footers). */
  function repeatedEdges(pages) {
    const seen = new Map();
    if (pages.length < 2) return new Set();
    for (const p of pages) {
      const rows = toRows(p.items);
      const edge = rows.slice(0, 2).concat(rows.slice(-2));
      for (const r of new Set(edge)) {
        const k = norm(r.segs.map((s) => s.text).join(" "));
        if (k) seen.set(k, (seen.get(k) || 0) + 1);
      }
    }
    return new Set([...seen].filter(([, n]) => n >= Math.max(2, pages.length * 0.6)).map(([k]) => k));
  }

  const percentile = (list, p) => { const s = list.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))] || 0; };

  /* Join the visual lines of one wrapped paragraph or bullet into one line. */
  function joinWrapped(lines) {
    const out = [];
    for (const l of lines) {
      const glyph = BULLET_RE.exec(l.text);
      if (glyph && /^\s*[•◦▪▸►‣●○■◆➢➤✓✔·*–—-]/.test(l.text)) { l.bullet = true; l.text = l.text.slice(glyph[0].length); }
      const prev = out[out.length - 1];
      if (prev && prev.text && l.text && canJoin(prev, l)) {
        prev.text = /[\p{L}]-$/u.test(prev.text) || l.glue ? prev.text + l.text : prev.text + " " + l.text;
        prev.x1 = l.x1;
        prev.joined = true;
        continue;
      }
      out.push(l);
    }
    return out.filter((l) => l.text);
  }

  function canJoin(a, b) {
    // the end of an email or link that broke onto its own line
    if (!a.tabs && /[\w@/.-]$/.test(a.text) && /[@/]|\.[a-z]/.test(a.text.split(" ").pop()) && /^[a-z0-9./-]{1,12}$/.test(b.text)
      && b.gap > 0 && b.gap < 1.75 && Math.abs(a.size - b.size) < 0.6) { b.glue = true; return true; }
    if (a.tabs || b.tabs || b.bullet || a.page !== b.page) return false;
    if (b.gap > 1.75 || b.gap <= 0) return false;
    if (Math.abs(a.size - b.size) > 0.6 || a.bold !== b.bold) return false;
    if (/[\p{L}]-$/u.test(a.text) && /^\p{Ll}/u.test(b.text)) return true;      // a word (or link) broken at its hyphen
    if (/^\p{Lu}/u.test(b.text) && !a.bullet && !a.joined && a.text.length < 35 && !/[,&–-]$/.test(a.text) && !(isUpper(a.text) && isUpper(b.text))) return false;
    if (/[:]$/.test(a.text) || isHeading(a) || isHeading(b)) return false;
    const width = a.right - a.left;
    const full = a.x1 >= a.right - Math.max(width * 0.16, a.size * 4);
    if (!full) return false;
    if (a.bullet) return b.x0 > a.x0 - a.size * 0.5;          // the text of a bullet wraps under its first word
    return Math.abs(b.x0 - a.x0) < a.size * 1.5 || /^[a-z(]/.test(b.text);
  }

  // ---- DOCX / ODT
  async function unzip(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("That file is damaged (not a complete zip)");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    const want = /^(word\/document\.xml|word\/_rels\/document\.xml\.rels|word\/numbering\.xml|word\/styles\.xml|content\.xml)$/;
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (!want.test(name)) continue;
      const lh = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const data = buf.subarray(lh, lh + csize);
      let raw;
      if (method === 0) raw = data;
      else if (method === 8) raw = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
      else continue;
      files[name] = new TextDecoder().decode(raw);
    }
    return files;
  }

  const parseXml = (text) => new DOMParser().parseFromString(text, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

  function docxLines(zip) {
    const doc = parseXml(zip["word/document.xml"]);
    const styles = zip["word/styles.xml"] ? parseXml(zip["word/styles.xml"]) : null;
    const styleInfo = {};
    if (styles) for (const s of styles.getElementsByTagNameNS(W, "style")) {
      const id = s.getAttributeNS(W, "styleId") || s.getAttribute("w:styleId");
      const nameEl = s.getElementsByTagNameNS(W, "name")[0];
      const name = nameEl ? (nameEl.getAttributeNS(W, "val") || nameEl.getAttribute("w:val") || "") : "";
      const sz = s.getElementsByTagNameNS(W, "sz")[0];
      const b = s.getElementsByTagNameNS(W, "b")[0];
      styleInfo[id] = { name: name.toLowerCase(), size: sz ? +(sz.getAttributeNS(W, "val") || sz.getAttribute("w:val")) / 2 : 0,
        bold: !!b && !/^(0|false)$/.test(b.getAttributeNS(W, "val") || b.getAttribute("w:val") || "") };
    }
    const val = (el) => (el ? el.getAttributeNS(W, "val") || el.getAttribute("w:val") || "" : "");
    const out = [];
    const body = doc.getElementsByTagNameNS(W, "body")[0] || doc.documentElement;
    const paras = body.getElementsByTagNameNS(W, "p");
    for (const p of paras) {
      // a paragraph inside a text box shows up twice (fallback copy); skip the fallback
      if (p.closest && p.closest("Fallback")) continue;
      const ppr = p.getElementsByTagNameNS(W, "pPr")[0];
      const sid = ppr ? val(ppr.getElementsByTagNameNS(W, "pStyle")[0]) : "";
      const st = styleInfo[sid] || { name: sid.toLowerCase(), size: 0, bold: false };
      const list = !!(ppr && ppr.getElementsByTagNameNS(W, "numPr")[0]) || /list/.test(st.name);
      let text = "", boldChars = 0, chars = 0, size = 0;
      const pieces = [];
      for (const n of p.getElementsByTagName("*")) {
        if (n.namespaceURI !== W) continue;
        if (n.localName === "t") {
          const r = n.parentNode;
          const rpr = r && r.getElementsByTagNameNS(W, "rPr")[0];
          const b = rpr && rpr.getElementsByTagNameNS(W, "b")[0];
          const bold = b ? !/^(0|false)$/.test(val(b)) : st.bold;
          const sz = rpr && rpr.getElementsByTagNameNS(W, "sz")[0];
          if (sz) size = Math.max(size, +val(sz) / 2);
          text += n.textContent;
          chars += n.textContent.trim().length;
          if (bold) boldChars += n.textContent.trim().length;
        } else if (n.localName === "tab" && n.parentNode && n.parentNode.localName === "r") text += "\t";
        else if ((n.localName === "br" || n.localName === "cr") && n.parentNode && n.parentNode.localName === "r") { pieces.push(text); text = ""; }
      }
      pieces.push(text);
      const heading = /heading|title|subtitle/.test(st.name) && !/toc/.test(st.name);
      for (const piece of pieces) {
        const t = clean(piece);
        if (!t) continue;
        out.push({ text: t, size: size || st.size || 11, bold: chars > 0 && boldChars > chars * 0.6, bullet: list,
          heading, title: /^title$/.test(st.name) });
      }
      // table cells: each paragraph is its own line, which is what we want
    }
    return bulletGlyphs(out);
  }

  function docxLinks(zip) {
    const rels = zip["word/_rels/document.xml.rels"];
    if (!rels) return [];
    return [...rels.matchAll(/Target="([^"]+)"[^>]*TargetMode="External"|TargetMode="External"[^>]*Target="([^"]+)"/g)]
      .map((m) => (m[1] || m[2]).replace(/&amp;/g, "&")).filter((u) => /^https?:/i.test(u));
  }

  function odtLines(xml) {
    const doc = parseXml(xml);
    const out = [];
    const T = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
    const walk = (n, inList) => {
      for (const c of n.childNodes) {
        if (c.nodeType !== 1) continue;
        if (c.namespaceURI === T && (c.localName === "p" || c.localName === "h")) {
          const t = clean(odtText(c));
          if (t) out.push({ text: t, size: c.localName === "h" ? 14 : 11, bold: false, bullet: inList, heading: c.localName === "h" });
        } else walk(c, inList || (c.namespaceURI === T && c.localName === "list-item"));
      }
    };
    const odtText = (n) => [...n.childNodes].map((c) => (c.nodeType === 3 ? c.nodeValue
      : c.localName === "tab" ? "\t" : c.localName === "s" ? " " : c.localName === "line-break" ? "\n" : odtText(c))).join("");
    walk(doc.documentElement, false);
    return bulletGlyphs(out.flatMap((l) => l.text.split("\n").map((t) => Object.assign({}, l, { text: clean(t) }))).filter((l) => l.text));
  }

  // ---- HTML, RTF, plain text
  function htmlLines(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, noscript, template, svg, head").forEach((n) => n.remove());
    const out = [];
    const BLOCK = /^(p|div|li|h[1-6]|td|th|tr|section|article|header|footer|dt|dd|blockquote|pre|address|aside|main|nav|ul|ol|table|br)$/i;
    const walk = (n) => {
      let buf = "";
      const flush = (tag) => {
        const t = clean(buf);
        buf = "";
        if (!t) return;
        out.push({ text: t, size: /^h1$/i.test(tag) ? 24 : /^h[2-3]$/i.test(tag) ? 15 : 11, bold: /^(h[1-6]|th|strong|b)$/i.test(tag),
          bullet: /^li$/i.test(tag), heading: /^h[2-6]$/i.test(tag), title: /^h1$/i.test(tag) });
      };
      for (const c of n.childNodes) {
        if (c.nodeType === 3) buf += c.nodeValue.replace(/\s+/g, " ");
        else if (c.nodeType === 1) {
          if (BLOCK.test(c.tagName)) { flush(n.tagName); walkBlock(c); }
          else if (/^(a)$/i.test(c.tagName) && /^(mailto:|tel:|https?:)/.test(c.getAttribute("href") || "")
            && !c.textContent.includes(c.getAttribute("href").replace(/^(mailto:|tel:)/, ""))) buf += c.textContent + " ";
          else buf += c.textContent.replace(/\s+/g, " ");
        }
      }
      flush(n.tagName);
    };
    const walkBlock = (c) => {
      if (/^br$/i.test(c.tagName)) return;
      if ([...c.children].some((k) => BLOCK.test(k.tagName))) walk(c);
      else {
        const t = clean(c.textContent.replace(/\s+/g, " "));
        if (t) out.push({ text: t, size: /^h1$/i.test(c.tagName) ? 24 : /^h[2-3]$/i.test(c.tagName) ? 15 : 11,
          bold: /^(h[1-6]|th)$/i.test(c.tagName) || (c.children.length === 1 && /^(strong|b)$/i.test(c.children[0].tagName) && c.children[0].textContent.trim() === c.textContent.trim()),
          bullet: /^li$/i.test(c.tagName), heading: /^h[2-6]$/i.test(c.tagName), title: /^h1$/i.test(c.tagName) });
      }
    };
    walk(doc.body || doc.documentElement);
    return bulletGlyphs(out);
  }

  function rtfText(rtf) {
    let s = rtf.replace(/\{\\\*[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, "")
      .replace(/\{\\(fonttbl|colortbl|stylesheet|info|pict)[\s\S]*?\}\}?/g, "");
    s = s.replace(/\\par[d]?\b ?|\\line\b ?|\\row\b ?/g, "\n").replace(/\\tab\b ?|\\cell\b ?/g, "\t")
      .replace(/\\'([0-9a-f]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\u(-?\d+)\??/g, (m, n) => String.fromCharCode(n < 0 ? +n + 65536 : +n))
      .replace(/\\bullet\b ?/g, "• ").replace(/\\endash\b ?/g, "–").replace(/\\emdash\b ?/g, "—")
      .replace(/\\[a-z]+-?\d* ?/gi, "").replace(/\\([{}\\])/g, "$1").replace(/[{}]/g, "");
    return s;
  }

  function textLines(text, md) {
    return bulletGlyphs(text.replace(/\r\n?/g, "\n").split("\n").map((raw) => {
      let t = raw.replace(/\s+$/, "");
      let heading = false, title = false, bold = false;
      if (md) {
        const m = /^(#{1,6})\s+(.*)$/.exec(t);
        if (m) { heading = m[1].length > 1; title = m[1].length === 1; t = m[2]; }
        if (/^\*\*[^*]+\*\*$/.test(t.trim())) bold = true;
        t = t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m2, a, u) => (a === u ? a : a + " " + u))
          .replace(/^(\s*)\+\s/, "$1- ").replace(/`/g, "");
        if (/^\s*([-=_*])\1{2,}\s*$/.test(t)) return null;
      } else if (/^\s*([-=_*~])\1{3,}\s*$/.test(t)) return null;
      return { text: clean(t.replace(/ {3,}/g, "\t")), size: title ? 24 : heading ? 15 : 11, bold, heading, title, bullet: false };
    }).filter((l) => l && l.text));
  }

  /* Move a leading bullet character into the bullet flag. */
  function bulletGlyphs(lines) {
    for (const l of lines) {
      const m = BULLET_RE.exec(l.text);
      if (m && (m[0].trim().length === 1 || /^\s*\(?\d{1,2}[.)]\s/.test(m[0]) && l.text.length > 25) && !/^[a-z][.)]\s/i.test(m[0])) {
        l.bullet = true;
        l.text = l.text.slice(m[0].length);
      }
    }
    return lines.filter((l) => l.text);
  }

  // ---- OCR (Android: on-device text recognition through the bridge)
  let ocrSeq = 0;
  const ocrWaiting = {};
  root.__ocrDone = (id, json) => { const w = ocrWaiting[id]; delete ocrWaiting[id]; if (w) w(json); };
  function nativeOcr(dataUrl) {
    if (!root.Native || !root.Native.ocr) return Promise.reject(new Error("Photos of a resume can’t be read here yet. Use the PDF or Word file"));
    return new Promise((resolve, reject) => {
      const id = "o" + ++ocrSeq;
      ocrWaiting[id] = (json) => {
        try {
          const r = JSON.parse(json);
          if (r.error) reject(new Error(r.error)); else resolve(r);
        } catch (e) { reject(e); }
      };
      root.Native.ocr(id, dataUrl.replace(/^data:[^,]+,/, ""));
    });
  }
  async function ocrCanvas(canvas) {
    const r = await nativeOcr(canvas.toDataURL("image/jpeg", 0.92));
    const items = [];
    for (const l of r.lines || []) {
      const hgt = l.bottom - l.top;
      items.push({ text: l.text, x0: l.left, x1: l.right, y: -((l.top + l.bottom) / 2), size: hgt * 0.8, bold: false });
    }
    return layoutLines([{ items, width: r.width || canvas.width, height: r.height || canvas.height }]);
  }
  async function ocrImage(file) {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 2600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const lines = await ocrCanvas(canvas);
    if (lines.length < 3) throw new Error("No text found in that picture. Try a sharper photo, straight on, in good light.");
    return lines;
  }

  // ------------------------------------------------------------------ parse
  function isHeading(l) {
    return !!headingKey(l);
  }
  function headingKey(l) {
    if (!l || !l.text || l.tabs || l.text.length > 48 || /[.,;]$/.test(l.text) || /^\p{Ll}/u.test(l.text)) return null;
    const t = norm(l.text.replace(/[:：]\s*$/, ""));
    if (!t || words(t).length > 5) return null;
    if (HEADINGS.has(t) && (!l.bullet || l.bold || isUpper(l.text) || l.size > l.bodySize * 1.05)) return HEADINGS.get(t);
    if (l.bullet) return null;
    const strong = l.heading || l.bold || isUpper(l.text) || (l.size && l.bodySize && l.size > l.bodySize * 1.12);
    if (!strong || /\d/.test(l.text) || words(t).length > 4) return null;
    for (const [k, key] of KEYWORDS) if (new RegExp("\\b" + k).test(t)) return key;
    return null;
  }

  function parse(lines, extra) {
    lines = lines.map((l) => Object.assign({}, l, { text: clean(l.text) })).filter((l) => l.text);
    const body = percentile(lines.map((l) => l.size || 11), 0.5) || 11;
    for (const l of lines) l.bodySize = body;

    // cut into sections. Section names share one look; a line that matches a
    // name but looks different ("Languages" over a group of skills) is not one.
    const cands = lines.map((l) => [l, headingKey(l)]).filter(([, k]) => k);
    const isExact = (l) => HEADINGS.has(norm(l.text.replace(/[:：]\s*$/, "")));
    const exactSizes = cands.filter(([l]) => isExact(l)).map(([l]) => l.size || 11);
    const domSize = exactSizes.length >= 2 ? percentile(exactSizes, 0.5) : 0;
    const domUpper = cands.filter(([l]) => isExact(l) && isUpper(l.text)).length > exactSizes.length / 2;
    const ocr = !!(extra && extra.ocr);          // text sizes from OCR boxes are too rough to compare
    const accepted = new Set(cands.filter(([l]) => {
      if (ocr) return isExact(l) || isUpper(l.text);
      if (!domSize) return true;
      const size = l.size || 11;
      if (isExact(l)) return size >= domSize - 0.6;
      return size >= domSize - 0.3 && isUpper(l.text) === domUpper;
    }).map(([l]) => l));
    const head = [];
    const sections = [];
    let cur = null;
    for (const l of lines) {
      const key = accepted.has(l) ? headingKey(l) : null;
      if (key) { cur = { key, title: l.text, lines: [] }; sections.push(cur); continue; }
      if (cur) cur.lines.push(l); else head.push(l);
    }

    const resume = root.Sample ? root.Sample.blank() : { basics: { name: "", label: "", email: "", phone: "", url: "", summary: "",
      location: { city: "", region: "", countryCode: "" }, profiles: [] }, work: [], education: [], certificates: [], skills: [], projects: [], languages: [] };
    resume.basics.location = resume.basics.location || { city: "", region: "", countryCode: "" };
    const skipped = [];

    // the top: name, headline, contact details (also from a "Contact" section)
    const contactLines = head.concat(...sections.filter((s) => s.key === "contact").map((s) => s.lines));
    readHeader(resume, head, contactLines, lines, extra);

    for (const s of sections) {
      const L = s.lines;
      if (!L.length) continue;
      if (s.key === "summary") {
        const text = L.map((l) => l.text.replace(/\t/g, " ")).join(" ");
        resume.basics.summary = (resume.basics.summary ? resume.basics.summary + "\n" : "") + text;
      } else if (s.key === "work" || s.key === "volunteer") {
        resume.work.push(...entries(L, "work"));
      } else if (s.key === "projects") {
        resume.projects.push(...entries(L, "projects"));
      } else if (s.key === "education") {
        resume.education.push(...entries(L, "education"));
      } else if (s.key === "skills") {
        resume.skills.push(...skillGroups(L, s.title));
      } else if (s.key === "interests") {
        const kw = splitList(L.map((l) => l.text).join(", "));
        if (kw.length) resume.skills.push({ name: "Interests", keywords: kw });
      } else if (s.key === "languages" && !L.some((l) => FLUENCY.test(l.text) || SPOKEN.test(l.text))) {
        resume.skills.push(...skillGroups(L, "Languages").map((g) => Object.assign(g, { name: g.name === "Skills" ? "Languages" : g.name })));
      } else if (s.key === "languages") {
        resume.languages.push(...languages(L));
      } else if (s.key === "certificates") {
        resume.certificates.push(...certificates(L));
      } else if (s.key === "references") {
        skipped.push(titleCase(s.title));
      }
    }
    // a summary paragraph under the name with no heading of its own
    if (!resume.basics.summary) {
      const para = head.filter((l) => !l.used && words(l.text).length >= 14 && !EMAIL_RE.test(l.text));
      if (para.length) resume.basics.summary = para.map((l) => l.text).join(" ");
    }
    resume.basics.summary = resume.basics.summary.replace(/\s+/g, " ").trim();
    // nothing recognised at all: keep the text as points of one entry, so nothing is lost
    if (!sections.length && lines.length > 6) {
      const rest = head.filter((l) => !l.used).map((l) => l.text);
      if (rest.length) resume.work.push({ position: "", name: "", startDate: "", endDate: "", highlights: rest });
    }
    resume._skipped = skipped;
    return resume;
  }

  function readHeader(resume, head, contactLines, all, extra) {
    const b = resume.basics;
    // the name: the largest text near the top that reads like a name
    const nameLike = (l) => {
      const t = l.text.replace(/\t/g, " ");
      const w = words(t);
      return w.length >= 1 && w.length <= 5 && letters(t) >= t.replace(/\s/g, "").length * 0.85 && !/@|\d|https?:|www\./i.test(t)
        && !headingKey(l) && !(w.length === 1 && !l.title && !(l.size > l.bodySize * 1.3)) && !TITLE_WORDS.test(t);
    };
    const pool = (head.length ? head : all.slice(0, 8)).slice(0, 14);
    let best = null;
    for (const l of pool) if (nameLike(l) && (!best || (l.title && !best.title) || (l.size || 0) > (best.size || 0) * 1.05)) best = l;
    if (!best) for (const l of all.slice(0, 20)) if (nameLike(l) && (l.size || 0) > l.bodySize * 1.3) { best = l; break; }
    if (best) {
      let name = best.text.replace(/\t/g, " ");
      // a name set on two lines ("ELENA" / "MARSH")
      const i = pool.indexOf(best), next = pool[i + 1];
      if (next && words(name).length === 1 && nameLike(next) && words(next.text).length <= 2 && Math.abs((next.size || 0) - (best.size || 0)) < 3) {
        name += " " + next.text; next.used = true;
      }
      b.name = titleCase(name).replace(/\s+/g, " ").trim();
      best.used = true;
    }

    // contact details anywhere in the top part
    const profiles = [];
    const addUrl = (u) => {
      u = u.replace(/[).,;]+$/, "");
      const bare = u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
      if (!bare || EMAIL_RE.test(bare)) return;
      if (profiles.some((p) => p.url.toLowerCase() === bare.toLowerCase()) || (b.url && b.url.toLowerCase() === bare.toLowerCase())) return;
      const net = /linkedin\.com/i.test(bare) ? "LinkedIn" : /github\.com/i.test(bare) ? "GitHub" : /gitlab\.com/i.test(bare) ? "GitLab"
        : /(twitter|x)\.com/i.test(bare) ? "X" : /behance\.net/i.test(bare) ? "Behance" : /dribbble\.com/i.test(bare) ? "Dribbble"
          : /medium\.com/i.test(bare) ? "Medium" : /stackoverflow\.com/i.test(bare) ? "Stack Overflow" : "";
      if (net) profiles.push({ network: net, url: bare });
      else if (!b.url) b.url = bare;
      else profiles.push({ network: "Website", url: bare });
    };
    for (const l of contactLines) {
      if (l.used) continue;
      let t = l.text, hit = false;
      const em = EMAIL_RE.exec(t);
      if (em) { if (!b.email) b.email = em[0]; t = t.replace(em[0], "\t"); hit = true; }
      let um;
      const urlG = new RegExp(URL_RE.source, "gi");
      while ((um = urlG.exec(t))) { addUrl(um[0]); hit = true; }
      t = t.replace(urlG, "\t");
      const parts = splitParts(t.replace(/(?:^|\s)(?:email|e-mail|mail|phone|mobile|tel|cell|linkedin|github|website|portfolio|address|location)\s*[:：]\s*/gi, "\t"));
      for (const part of parts) {
        const pm = PHONE_RE.exec(part);
        const digits = pm ? pm[0].replace(/\D/g, "") : "";
        if (pm && digits.length >= 8 && digits.length <= 15 && !RANGE_RE.test(part) && !/^(19|20)\d{2}$/.test(digits)) {
          if (!b.phone) b.phone = clean(pm[0]);
          hit = true;
          const rest = clean(part.replace(pm[0], ""));
          if (rest && looksLikeLocation(rest) && !b.location.city) { setLocation(b, rest); }
        } else if (looksLikeLocation(part) && !b.location.city && words(part).length <= 6) {
          setLocation(b, part);
          hit = true;
        } else if (!b.label && parts.length > 1 && TITLE_WORDS.test(part) && words(part).length <= 6 && !/\d/.test(part)) {
          b.label = titleCase(part);
        }
      }
      if (hit) l.used = true;
    }
    for (const u of (extra && extra.links) || []) if (/linkedin|github|gitlab|behance|dribbble/i.test(u)) addUrl(u);
    // whole document, as a fallback for an email or phone in a footer
    if (!b.email) for (const l of all) { const m = EMAIL_RE.exec(l.text); if (m) { b.email = m[0]; break; } }
    b.profiles = profiles;

    // the headline: a short line right after the name, or the next biggest line
    const rest = head.filter((l) => !l.used && l.text.length <= 70 && words(l.text).length <= 9 && !headingKey(l) && !/@|https?:/.test(l.text));
    const after = best ? head.slice(head.indexOf(best) + 1).find((l) => !l.used) : null;
    let label = after && rest.includes(after) && !/[.!?]$/.test(after.text) ? after
      : rest.find((l) => TITLE_WORDS.test(l.text) && !/[.!?]$/.test(l.text));
    if (label) { b.label = titleCase(label.text.replace(/\t/g, " | ")); label.used = true; }
  }

  function setLocation(b, text) {
    const parts = clean(text).replace(/^\(|\)$/g, "").split(/\s*,\s*/).filter(Boolean);
    b.location.city = parts[0] || "";
    if (parts.length === 3) { b.location.region = parts[1]; b.location.countryCode = parts[2]; }
    else if (parts.length === 2) { if (/^[A-Z]{2}$/.test(parts[1]) && parts[1].length === 2) b.location.region = parts[1]; else b.location.countryCode = parts[1]; }
  }

  /* Names, titles and places: few words, most of them capitalised. */
  function titleLike(t) {
    const w = words(t.replace(/[|│·•,()–—-]/g, " ")).filter((x) => !SMALL.has(x.toLowerCase()));
    if (!w.length || w.length > 10 || /[.;!?]$/.test(t)) return false;
    return w.filter((x) => /^[\p{Lu}\d]/u.test(x)).length >= w.length * 0.6;
  }

  // ---- entries: jobs, schools, projects
  function entries(lines, kind) {
    let L = lines;
    const single = kind === "education" || kind === "projects";
    const hasBold = L.some((l) => l.bold) && !L.every((l) => l.bold);
    const bl = L.filter((l) => l.bullet);
    const boldBullets = bl.filter((l) => l.bold).length > bl.length * 0.4;
    const isHead = (l, i) => {
      // a bold line with a dot before it (a timeline) and dates under it is a heading too
      if (l.bullet && !(hasBold && l.bold && !boldBullets && L[i + 1] && !L[i + 1].bullet && takeDates(L[i + 1].text, single).found)) return false;
      if (l.tabs || takeDates(l.text, single).found) return true;
      if (hasBold && l.bold && l.text.length < 120) return true;
      if (l.text.length > 110 || /[.;]$/.test(l.text)) return false;
      if (!titleLike(l.text) && (words(l.text).length > 6 || !takeDates((L[i + 1] || {}).text || "", single).found)) return false;
      // right under a heading line, before any points: the company, the school, the place
      const prev = L[i - 1];
      if (prev && !prev.bullet && cur.head.length && !cur.body.length && l.text.length < 90) return true;
      // a short line followed (soon) by a line with dates
      for (let k = i + 1; k <= i + 2 && k < L.length; k++) {
        if (L[k].bullet || (k === i + 2 && !titleLike(l.text))) break;
        if (takeDates(L[k].text, single).found && L[k].text.length < 120) return true;
      }
      if (kind === "education" && (DEGREE.test(l.text) || SCHOOL.test(l.text)) && l.text.length < 120) return true;
      return false;
    };
    // "Mar 2022" on one line and "to Present" under it (a narrow date column)
    L = L.map((l) => Object.assign({}, l));
    const endRe = new RegExp(`^(?:to|until|till|-|–|—)\\s*(?:${DATE}|${PRESENT})$`, "i");
    const dateRe = new RegExp(`^${DATE}$`, "i");
    for (let i = 0; i + 1 < L.length; i++) {
      const a = L[i].text.split("\t"), b = L[i + 1].text.split("\t");
      for (const [ai, bi] of [[0, 0], [a.length - 1, b.length - 1]]) {
        if (dateRe.test(a[ai].trim()) && endRe.test(b[bi].trim())) {
          a[ai] = a[ai].trim() + " " + b[bi].trim();
          b.splice(bi, 1);
          L[i].text = a.join("\t");
          L[i].tabs = a.length > 1;
          L[i + 1].text = b.join("\t");
          L[i + 1].tabs = b.length > 1;
          break;
        }
      }
    }
    L = L.filter((l) => l.text.trim());
    const out = [];
    let e = null;
    const cur = { head: [], body: [] };
    L.forEach((l, i) => {
      if (e) { cur.head = e.head; cur.body = e.body; }
      const head = isHead(l, i);
      const dated = takeDates(l.text, single).found;
      const start = head && (!e || e.body.length || (dated && e.dated) || (kind === "education" && e.head.length >= 2 && e.dated
        && (DEGREE.test(l.text) || SCHOOL.test(l.text))) || e.head.length >= 4);
      if (start) { e = { head: [], body: [], dated: false }; out.push(e); }
      if (!e) { e = { head: [], body: [], dated: false }; out.push(e); }
      if (head && !e.body.length) { e.head.push(l); if (dated) e.dated = true; } else e.body.push(l);
    });
    return out.map((x) => (kind === "work" ? workEntry : kind === "education" ? eduEntry : projectEntry)(x)).filter(Boolean);
  }

  function headParts(e, single) {
    let start = "", end = "", present = false;
    const parts = [];
    for (const l of e.head) {
      const d = takeDates(l.text, single);
      if (d.found && !start && !end) { start = d.start; end = d.end; present = !!d.present; }
      parts.push(...splitParts(d.found ? d.rest : l.text).map((t) => ({ t, bold: l.bold, size: l.size })));
    }
    return { parts, start, end, present };
  }

  function bodyPoints(e) {
    const points = [], para = [];
    const anyBullet = e.body.some((l) => l.bullet);
    for (const l of e.body) {
      const t = l.text.replace(/\t/g, " ").trim();
      if (!t) continue;
      if (anyBullet && !l.bullet && !points.length) para.push(t);
      else if (anyBullet && !l.bullet && points.length && /^[a-z]/.test(t)) points[points.length - 1] += " " + t;
      else points.push(t);
    }
    return { points, summary: para.join(" ") };
  }

  function workEntry(e) {
    const { parts, start, end } = headParts(e, false);
    let position = "", name = "", location = "";
    const rest = [];
    // "Lead Designer, Lumen Payments": a title and a company joined by a comma
    const expanded = [];
    for (const p of parts) {
      const c = /^([^,]+),\s*(.+)$/.exec(p.t);
      const hasTitle = (t) => TITLE_WORDS.test(t) && !ORG_WORDS.test(t);
      if (c && parts.length <= 2 && !looksLikeLocation(p.t) && ((hasTitle(c[1]) && !hasTitle(c[2])) || (hasTitle(c[2]) && !hasTitle(c[1]) && !looksLikeLocation(c[2])))) {
        expanded.push({ t: c[1].trim(), bold: p.bold }, { t: c[2].trim(), bold: p.bold });
      } else expanded.push(p);
    }
    parts.splice(0, parts.length, ...expanded);
    for (const p of parts) {
      // "Acme Corp, Berlin, Germany" -> company + location
      const m = /^(.*?),\s*(\p{Lu}[\p{L} .'-]+,\s*\p{Lu}[\p{L} .'-]+)$/u.exec(p.t);
      if (!location && m && looksLikeLocation(m[2]) && !TITLE_WORDS.test(m[2]) && !looksLikeLocation(p.t.split(",").slice(0, 2).join(",") + ", X")) {
        rest.push({ t: m[1], bold: p.bold }); location = m[2]; continue;
      }
      if (!location && m && looksLikeLocation(m[2]) && parts.length === 1) { rest.push({ t: m[1], bold: p.bold }); location = m[2]; continue; }
      // "Acme Corp, Bangalore & USA (on-site)": only the "(on-site)" made it look like a place; the company comes first
      const c3 = /^([^,(]+),\s*(.+)$/.exec(p.t), bare = p.t.replace(/\s*\((remote|hybrid|on-?site)[^)]*\)\s*$/i, "");
      if (!location && c3 && bare !== p.t && looksLikeLocation(p.t) && !looksLikeLocation(bare) && !TITLE_WORDS.test(c3[1])) {
        rest.push({ t: c3[1].trim(), bold: p.bold }); location = c3[2].trim(); continue;
      }
      if (!location && looksLikeLocation(p.t)) { location = p.t.replace(/^\(|\)$/g, ""); continue; }
      const m2 = /^(.*?)\s*\(([^)]+)\)$/.exec(p.t);
      if (!location && m2 && looksLikeLocation(m2[2])) { rest.push({ t: m2[1], bold: p.bold }); location = m2[2]; continue; }
      rest.push(p);
    }
    const score = (t) => (t.match(new RegExp(TITLE_WORDS.source, "gi")) || []).length + (new RegExp("(" + TITLE_WORDS.source + ")\\W*$", "i").test(t) ? 1 : 0)
      - (t.match(new RegExp(ORG_WORDS.source, "gi")) || []).length;
    let titled = -1, bestScore = 0;
    rest.forEach((p, i) => { const sc = score(p.t); if (sc > bestScore) { bestScore = sc; titled = i; } });
    if (titled >= 0) {
      position = rest[titled].t;
      const other = rest.filter((_, i) => i !== titled);
      name = (other.find((p) => ORG_WORDS.test(p.t)) || other[0] || {}).t || "";
      const extra = other.filter((p) => p.t !== name).map((p) => p.t);
      if (extra.length === 1 && !location && looksLikeLocation(extra[0])) location = extra[0];
      else if (extra.length === 1 && words(extra[0]).length <= 3 && !ORG_WORDS.test(extra[0])) position += ", " + extra[0];
    } else if (rest.length) {
      const org = rest.findIndex((p) => ORG_WORDS.test(p.t));
      if (org >= 0) { name = rest[org].t; position = (rest.find((_, i) => i !== org) || {}).t || ""; }
      else { position = rest[0].t; name = (rest[1] || {}).t || ""; }
    }
    // "Acme Labs, Austin, TX" with no company found: the first part is the company
    if (!name && location.split(",").length === 3) {
      const [n, ...where] = location.split(",");
      name = n.trim();
      location = where.join(",").trim();
    }
    const { points, summary } = bodyPoints(e);
    if (!position && !name && !points.length) return null;
    return { position: titleCase(position), name: titleCase(name), location, startDate: start, endDate: end,
      summary, highlights: points };
  }

  function eduEntry(e) {
    const { parts, start, end } = headParts(e, true);
    let studyType = "", area = "", institution = "", score = "", location = "";
    const courses = [];
    const scoreRe = /\b(?:c?gpa|grade|percentage|score|marks|result)\s*[:\-–]?\s*[\d.]+\s*(?:\/\s*[\d.]+)?%?|\b\d{1,2}(?:\.\d+)?\s*%|\b\d(?:\.\d{1,2})?\s*\/\s*(?:4|5|10)(?:\.0)?\b|\b(first class(?: with distinction)?|distinction|(?:summa |magna )?cum laude|with honou?rs|first division)\b/i;
    const split = [];
    for (const p of parts) {
      const bits = p.t.split(/\s*,\s*/);
      const di = bits.findIndex((x) => DEGREE.test(x)), si = bits.findIndex((x) => SCHOOL.test(x));
      if (bits.length > 1 && di >= 0 && si >= 0 && di !== si) {
        // keep "City, State" after the school together with it
        const lo = Math.min(di, si), hi = Math.max(di, si);
        split.push({ t: bits.slice(0, hi).join(", ") }, { t: bits.slice(hi).join(", ") });
        if (lo > 0) split[split.length - 2].t = bits.slice(0, hi).join(", ");
      } else split.push(p);
    }
    for (const p of split) {
      let t = p.t;
      const sm = scoreRe.exec(t);
      if (sm && !score) { score = clean(sm[0]); t = clean(t.replace(sm[0], "")).replace(/^[,;·\s]+|[,;·\s(]+$/g, ""); }
      if (!t) continue;
      if (!location && looksLikeLocation(t) && !SCHOOL.test(t)) { location = t; continue; }
      if (!studyType && DEGREE.test(t) && !SCHOOL.test(t.replace(DEGREE, ""))) {
        const m = /^(.*?)(?:\s+in\s+|\s+of\s+(?=[A-Z][a-z]+\s+[A-Z]|[A-Z][a-z]+$)|,\s*|\s+[–—-]\s+|\s*:\s*)(.+)$/.exec(t);
        if (m && DEGREE.test(m[1])) { studyType = m[1]; area = m[2]; } else studyType = t;
      } else if (!institution && (SCHOOL.test(t) || !DEGREE.test(t))) {
        const m = /^(.*?),\s*(\p{Lu}[\p{L} .'-]+(?:,\s*\p{Lu}[\p{L} .'-]+)?)$/u.exec(t);
        if (m && looksLikeLocation(m[2] + (m[2].includes(",") ? "" : ", X")) && SCHOOL.test(m[1])) { institution = m[1]; location = location || m[2]; }
        else institution = t;
      } else if (!area && studyType) area = t;
    }
    for (const l of e.body) {
      const t = l.text.replace(/\t/g, " ");
      const cm = /^(?:relevant\s+)?(?:course\s*work|courses|subjects|modules)\s*[:\-–]\s*(.+)$/i.exec(t);
      if (cm) courses.push(...splitList(cm[1]));
      else if (!score && scoreRe.test(t)) score = clean(scoreRe.exec(t)[0]);
      else if (!institution && SCHOOL.test(t)) institution = t;
      else if (!studyType && DEGREE.test(t)) studyType = t;
    }
    if (!studyType && !institution) return null;
    return { studyType: titleCase(studyType), area: titleCase(area), institution: titleCase(institution), location,
      startDate: start, endDate: end, score, courses };
  }

  function projectEntry(e) {
    const { parts, start, end } = headParts(e, true);
    let name = "", url = "";
    const other = [];
    for (const p of parts) {
      const um = URL_RE.exec(p.t);
      if (um && !url && !EMAIL_RE.test(p.t)) { url = um[0].replace(/^https?:\/\/(www\.)?/i, ""); const rest = clean(p.t.replace(um[0], "")).replace(/[()|]/g, "").trim(); if (rest && !name) name = rest; continue; }
      if (!name) name = p.t; else other.push(p.t);
    }
    e.body = e.body.filter((l) => {
      const t = l.text.trim();
      const um = URL_RE.exec(t);
      if (!url && um && um[0].length >= t.length - 2 && !EMAIL_RE.test(t)) { url = um[0].replace(/^https?:\/\/(www\.)?/i, ""); return false; }
      return true;
    });
    const { points, summary } = bodyPoints(e);
    let description = [other.join(" · "), summary].filter(Boolean).join(" ");
    let highlights = points;
    if (!description && points.length > 1 && !e.body[0].bullet && e.body.some((l) => l.bullet)) { description = points[0]; highlights = points.slice(1); }
    if (!name && !points.length) return null;
    return { name: titleCase(name), url, description, startDate: start, endDate: end, highlights };
  }

  // ---- skills, languages, certificates
  function splitList(s) {
    return String(s).split(/\s*(?:,|;|\t|\s[|│•·▪◆]\s|[•·▪◆]|\s\/\s)\s*/).map((x) => clean(x).replace(/^(and|&)\s+/i, "").replace(/[.]$/, ""))
      .filter((x) => x && x.length <= 60);
  }

  function skillGroups(lines, sectionTitle) {
    let L = lines;
    const groups = [];
    let g = null;
    const hasBold = L.some((l) => l.bold) && !L.every((l) => l.bold);
    // group names look different from the skills under them (size or weight)
    const look = (l) => `${Math.round((l.size || 11) * 2)}|${!!l.bold}`;
    const looks = {};
    for (const l of L) looks[look(l)] = (looks[look(l)] || 0) + l.text.length;
    const itemLook = Object.entries(looks).sort((a, b) => b[1] - a[1])[0][0];
    const groupOf = (name) => { g = { name: titleCase(name), keywords: [] }; groups.push(g); return g; };
    // a tab separates a group name from its skills only when no line is a group name on its own
    const titleLines = L.filter((l) => !l.tabs && look(l) !== itemLook && words(l.text).length <= 5);
    const tabLabel = titleLines.length <= 1 && L.filter((l) => l.tabs).length >= L.length * 0.5;
    // two groups side by side: "Cloud: AWS, GCP ⇥ Containers: Docker"
    L = L.flatMap((l) => {
      const cells = l.text.split("\t");
      return cells.length > 1 && cells.filter((c) => /^[^:：]{2,40}[:：]/.test(c)).length >= 2
        ? cells.map((c) => Object.assign({}, l, { text: c, tabs: false })) : [l];
    });
    L.forEach((l, i) => {
      const t = l.text;
      const labelled = (tabLabel ? /^([^:：\t]{2,40})[:：\t]\s*(.+)$/ : /^([^:：\t]{2,40})[:：]\s*(.+)$/).exec(t)
        || /^([^,:：\t]{2,40}?)\s+[—–]\s+(.+,.+)$/.exec(t);
      if (labelled && !/https?$/i.test(labelled[1]) && words(labelled[1]).length <= 5) {
        groupOf(labelled[1]).keywords.push(...splitList(labelled[2]));
        g = null;
        return;
      }
      const next = L[i + 1];
      const titleish = !l.bullet && words(t).length <= 5 && !/[,;|•·\t]/.test(t) && (
        (look(l) !== itemLook && next && look(next) === itemLook) || (hasBold && l.bold) || /:$/.test(t)
        || (isUpper(t) && t.length > 4 && next && !isUpper(next.text)));
      if (titleish && next && !headingKey(next)) { groupOf(t.replace(/:$/, "")); return; }
      const items = splitList(t);
      if (items.length === 1 && words(items[0]).length > 8) return;       // a sentence, not a skill
      if (!g) groupOf(/skill/i.test(sectionTitle) && !/technical|core|key/i.test(sectionTitle) ? "Skills" : titleCase(sectionTitle));
      for (const k of items) if (!g.keywords.some((x) => x.toLowerCase() === k.toLowerCase())) g.keywords.push(k);
    });
    return groups.filter((x) => x.keywords.length);
  }

  function languages(L) {
    const out = [];
    for (const l of L) {
      for (const item of splitList(l.text)) {
        const m = /^(\p{L}[\p{L} ]*?)\s*(?:\(([^)]+)\)|[:\-–—]\s*(.+)|\s+(native|fluent|professional|conversational|basic|intermediate|advanced|beginner|elementary|bilingual|[abc][12]))$/iu.exec(item);
        if (m) out.push({ language: titleCase(m[1]), fluency: titleCase(m[2] || m[3] || m[4] || "") });
        else if (FLUENCY.test(item) && out.length && !out[out.length - 1].fluency && words(item).length <= 4) out[out.length - 1].fluency = titleCase(item);
        else if (words(item).length <= 3) out.push({ language: titleCase(item), fluency: "" });
      }
    }
    return out;
  }

  function certificates(L) {
    const out = [];
    const look = (l) => `${Math.round((l.size || 11) * 2)}|${!!l.bold}|${isUpper(l.text)}`;
    const nameLook = L.length ? look(L[0]) : "";
    let prevLine = null;
    for (const l of L) {
      const d = takeDates(l.text, true);
      const text = d.found ? d.rest : l.text;
      const parts = splitParts(text);
      const prev = out[out.length - 1];
      // a certificate name that wrapped onto a second line
      if (prev && prevLine && !prev.date && !prev.issuer && !l.bullet && look(l) === look(prevLine) && look(l) === nameLook
        && !d.found && l.gap && l.gap < 1.6 && L.some((x) => look(x) !== nameLook)) {
        prev.name = prev.name + " " + titleCase(clean(text));
        prevLine = l;
        continue;
      }
      prevLine = l;
      // the issuer/date line under a certificate's name
      if (prev && !prev.issuer && !l.bullet && ((look(l) !== nameLook) || (!prev.date && d.found && parts.length <= 1 && words(text).length <= 6))) {
        prev.issuer = parts.join(" · ");
        if (d.found && !prev.date) prev.date = d.end || d.start;
        continue;
      }
      let name = text, issuer = "";
      const cells = text.split(/\t|\s+[|│·•]\s+/).map(clean).filter(Boolean);
      const comma = /^(.*?),\s*([^,]+)$/.exec(text);
      const dash = /^(.*)\s+[–—-]\s+([^–—-]+)$/.exec(text);
      const by = /^(.*?)\s+(?:by|from)\s+(.+)$/i.exec(text);
      if (cells.length >= 2 && isIssuer(cells[cells.length - 1])) { issuer = cells.pop(); name = cells.join(" – "); }
      else if (comma && isIssuer(comma[2])) { name = comma[1]; issuer = comma[2]; }
      else if (dash && isIssuer(dash[2])) { name = dash[1]; issuer = dash[2]; }
      else if (by && isIssuer(by[2])) { name = by[1]; issuer = by[2]; }
      else name = cells.join(" – ");
      if (!name) continue;
      out.push({ name: titleCase(clean(name).replace(/[–—-]\s*$/, "")), issuer: titleCase(issuer), date: d.found ? d.end || d.start : "" });
    }
    return out;
  }

  const isIssuer = (t) => words(t).length <= 7 && (ORG_WORDS.test(t) || /\b(amazon|aws|google|microsoft|coursera|udemy|edx|linkedin|linux foundation|hashicorp|cisco|comptia|oracle|pmi|scrum alliance|scrum\.org|salesforce|ibm|meta|red hat|isc2|\(isc\)²|isaca|axelos|nptel|infosys|tcs|hubspot|adobe|apple|autodesk|tableau|databricks|snowflake|mongodb|kubernetes|cncf|vmware|sap|ec-council|offensive security|gartner|harvard|stanford|mit)\b/i.test(t));

  // ------------------------------------------------------------------ report
  function report(resume, source, extra) {
    const r = resume || {};
    const n = (k) => (Array.isArray(r[k]) ? r[k].length : 0);
    const points = (r.work || []).concat(r.projects || []).reduce((s, w) => s + ((w && w.highlights) || []).length, 0);
    const skills = (r.skills || []).reduce((s, g) => s + ((g && g.keywords) || []).length, 0);
    const found = [];
    const b = r.basics || {};
    if (b.name) found.push(["Name", b.name]);
    const contact = [b.email && "email", b.phone && "phone", (b.location || {}).city && "city", b.url && "website"]
      .concat((b.profiles || []).map((p) => p.network || "link")).filter(Boolean);
    if (contact.length) found.push(["Contact", contact.join(", ").replace(/^./, (c) => c.toUpperCase())]);
    if (b.summary) found.push(["Summary", "Found"]);
    if (n("work")) found.push(["Roles", `${n("work")} (${points} lines)`]);
    if (n("education")) found.push(["Education", String(n("education"))]);
    if (skills) found.push(["Skills", String(skills)]);
    if (n("projects")) found.push(["Projects", String(n("projects"))]);
    if (n("certificates")) found.push(["Certifications", String(n("certificates"))]);
    if (n("languages")) found.push(["Languages", String(n("languages"))]);
    const skipped = r._skipped || [];
    delete r._skipped;
    return { source, found, skipped, ocr: !!(extra && extra.ocr), empty: !n("work") && !n("education") && !skills };
  }

  root.Importer = { read, readPdf, parse, layoutLines, toRows, findGutter, textLines, htmlLines, docxLines, unzip, takeDates, parseDate, titleCase, report,
    setPdfjs(lib) { pdfjs = lib; }, _readPdf: readPdf };
})(typeof window !== "undefined" ? window : globalThis);
