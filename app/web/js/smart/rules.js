/* The resume check: rules that read a resume and say what would make it
 * stronger. No AI and no network; it runs in the page on every change.
 *
 *   Smart.point(text) -> [{tone, text}]   hints for the point being typed
 *   Smart.check(resume, {template, pages, academic}) ->
 *     { score: 0..100, parts: [{id, name, got, max}],
 *       findings: [{part, weight, text, why, at: {section, i, field, index}}], good: ["…"] }
 *
 * A finding's weight is what it costs within its part. `at` says where it is:
 * i is the index of the entry in resume[section], index the point within it.
 */
(function () {
  "use strict";

  const VERBS = ("accelerated achieved acquired adapted administered advised analysed analyzed architected arranged assembled assessed audited "
    + "authored automated balanced boosted built captured chaired championed coached collaborated completed composed conceived conducted configured "
    + "consolidated constructed consulted converted coordinated created cut debugged decreased defined delivered deployed designed developed devised diagnosed "
    + "directed discovered doubled drafted drove earned edited eliminated enabled engineered enhanced established evaluated exceeded executed expanded "
    + "facilitated formed formulated founded generated grew guided halved handled headed identified implemented improved increased initiated installed "
    + "integrated introduced invented investigated launched led lowered maintained managed mapped mentored merged migrated modernised modernized monitored "
    + "moved negotiated onboarded opened operated optimised optimized orchestrated organised organized overhauled oversaw owned partnered performed piloted "
    + "pioneered planned prepared presented prevented produced programmed proposed prototyped published raised ran rebuilt recruited redesigned reduced "
    + "refactored refined released removed replaced reported researched resolved restructured revamped reviewed rolled saved scaled secured served set "
    + "shipped simplified sold solved spearheaded standardised standardized started streamlined strengthened supervised supported taught tested tracked "
    + "trained transformed translated tripled troubleshot turned unified upgraded used validated won wrote").split(" ");
  const WEAK = [/^responsible for\b/i, /^worked (on|with|in|as)\b/i, /^helped?( to)?\b/i, /^assist(ed|ing)?\b/i, /^duties (included|include)\b/i,
    /^tasked with\b/i, /^involved in\b/i, /^participated in\b/i, /^in charge of\b/i, /^handling\b/i, /^working\b/i];
  const BUZZ = ["team player", "hard working", "hardworking", "go-getter", "results-driven", "result oriented", "detail-oriented", "self-starter",
    "think outside the box", "synergy", "dynamic individual", "passionate", "motivated individual", "excellent communication skills", "go getter"];
  const verbs = new Set(VERBS);
  const first = (t) => (String(t).replace(/\*\*/g, "").trim().match(/^[A-Za-z’'-]+/) || [""])[0].toLowerCase();
  const hasNumber = (t) => /\d/.test(t);
  const months = (d) => { const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(d || ""); return m ? +m[1] * 12 + (m[2] ? +m[2] - 1 : 0) : null; };

  function check(resume, opts) {
    const o = opts || {}, r = resume, b = r.basics || {}, work = (r.work || []).filter((w) => !w.hidden);
    const found = [], good = [];
    const say = (part, weight, text, why, at) => found.push({ part, weight, text, why, at });
    const points = [];
    work.forEach((w) => (w.highlights || []).forEach((t, index) => { if (String(t).trim()) points.push({ t: String(t).trim(), w, i: r.work.indexOf(w), index }); }));
    const at = (p) => ({ section: "work", i: p.i, field: "highlights", index: p.index });
    const student = !work.length || work.length === 1 && (r.education || []).length >= 2;

    // ---- complete
    if (!String(b.name || "").trim()) say("complete", 6, "Add your name", "", { section: "basics", field: "name" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email || "")) say("complete", 5, b.email ? "The email address looks mistyped" : "Add an email address", "Recruiters reply by email first.", { section: "basics", field: "email" });
    if (!String(b.phone || "").trim()) say("complete", 3, "Add a phone number", "", { section: "basics", field: "phone" });
    if (!String(b.label || "").trim()) say("complete", 3, "Add a headline under your name", "The job title you are aiming for, such as “Senior Data Analyst”.", { section: "basics", field: "label" });
    if (!((b.location || {}).city || "").trim()) say("complete", 1, "Add your city", "Many employers filter by location.", { section: "basics", field: "city" });
    const sum = String(b.summary || "").trim();
    if (!sum) say("complete", 4, "Write a short summary", "Two or three lines at the top: who you are, your strongest area, one proof.", { section: "basics", field: "summary" });
    else if (sum.length < 80) say("complete", 2, "The summary is very short", "Aim for two or three lines.", { section: "basics", field: "summary" });
    else good.push("The summary is there and a sensible length");
    if (!work.length && !student) say("complete", 6, "Add your experience", "", { section: "work" });
    if (!(r.education || []).length) say("complete", 3, "Add your education", "", { section: "education" });
    const skillCount = (r.skills || []).reduce((n, g) => n + Math.max(1, (g.keywords || []).length), 0);
    if (skillCount < 5) say("complete", 3, skillCount ? "List a few more skills" : "Add your skills", "Application systems match on skills; eight to twenty is typical.", { section: "skills" });
    else good.push(skillCount + " skills listed");
    if (!(b.profiles || []).some((p) => /linkedin/i.test((p.network || "") + (p.url || "")))) say("complete", 1, "Add your LinkedIn profile", "Most recruiters look you up there.", { section: "basics" });

    const holes = spots(r).filter(([o, k]) => /\[[^\]]{2,}\]/.test(String(o[k] || "")));
    if (holes.length) {
      const [o, k] = holes[0], w = Array.isArray(o) ? work.find((x) => x.highlights === o) : null;
      say("complete", Math.min(8, 2 * holes.length), `${holes.length} place${holes.length === 1 ? " still has" : "s still have"} a [ ] to fill in`,
        "The parts in square brackets are from a suggested line; put your own facts there.",
        w ? { section: "work", i: r.work.indexOf(w), field: "highlights", index: k } : { section: "basics", field: "summary" });
    }

    // ---- impact
    if (points.length) {
      const weak = points.filter((p) => WEAK.some((re) => re.test(p.t)));
      weak.slice(0, 6).forEach((p) => say("impact", 2, `“${p.t.slice(0, 46)}…” starts weakly`, "Start with what you did: Built, Led, Cut, Launched…", at(p)));
      const noVerb = points.filter((p) => !verbs.has(first(p.t)) && !weak.includes(p));
      if (noVerb.length > points.length * 0.3) {
        noVerb.slice(0, 4).forEach((p) => say("impact", 1.5, `“${p.t.slice(0, 46)}…” doesn’t open with an action`, "Open with a strong verb in the past tense.", at(p)));
      } else good.push("Most lines open with a strong action verb");
      const share = points.filter((p) => hasNumber(p.t)).length / points.length;
      if (share < 0.3) {
        say("impact", share < 0.15 ? 10 : 6, `Only ${Math.round(share * 100)}% of your lines under “What you did” have a number`, "Numbers make results believable: how much, how many, how fast, how often. Aim for at least a third.",
          at(points.find((p) => !hasNumber(p.t))));
      } else good.push(Math.round(share * 100) + "% of your lines carry a number");
      const mine = points.filter((p) => /(^|\s)(I|my|me|we|our)(\s|$)/.test(p.t));
      mine.slice(0, 3).forEach((p) => say("impact", 1.5, `“${p.t.slice(0, 46)}…” speaks in the first person`, "Drop I, my and we: “Built…”, not “I built…”.", at(p)));
      const text = (sum + " " + points.map((p) => p.t).join(" ")).toLowerCase();
      BUZZ.filter((w) => text.includes(w)).slice(0, 3).forEach((w) => say("impact", 1, `“${w}” says little`, "Show it with a result instead of claiming it.", { section: sum.toLowerCase().includes(w) ? "basics" : "work", field: "summary" }));
      work.forEach((w) => { if (!(w.highlights || []).some((t) => String(t).trim())) say("impact", 3, `${w.position || w.name ? "“" + (w.position || w.name) + "”" : "A role"} has nothing under “What you did”`, "Two to five lines on what you achieved there.", { section: "work", i: r.work.indexOf(w) }); });
    }

    // ---- brief
    points.filter((p) => p.t.length > 230).slice(0, 5).forEach((p) => say("brief", 1.5, `“${p.t.slice(0, 46)}…” runs long`, "Keep each to one or two lines on the page; split it or cut the setup.", at(p)));
    work.forEach((w, n) => {
      const c = (w.highlights || []).filter((t) => String(t).trim()).length;
      if (c > (n === 0 ? 9 : 6)) say("brief", 2, `“${w.position || w.name}” has ${c} lines under “What you did”`, n === 0 ? "Keep the best eight or so." : "Older roles need fewer: keep the best four to six.", { section: "work", i: r.work.indexOf(w) });
    });
    if (sum.length > 650) say("brief", 3, "The summary is long", "Three or four lines is plenty.", { section: "basics", field: "summary" });
    if (o.pages && !o.academic) {
      const years = work.length ? (months(work[0].endDate) || new Date().getFullYear() * 12) - (months(work[work.length - 1].startDate) || 0) : 0;
      if (o.pages > 2) say("brief", 6, `The resume is ${o.pages} pages`, "Two pages is the usual limit outside academia. Try Design → Fit to two pages, or hide older roles.", { design: true });
      else if (o.pages === 2 && years > 0 && years < 60) say("brief", 3, "Two pages with under five years of experience", "One page usually reads better at this stage. Try Design → Fit to one page.", { design: true });
      else good.push(o.pages === 1 ? "Fits one page" : "Fits two pages");
    }

    // ---- consistent
    if (points.length > 3) {
      const dots = points.filter((p) => /[.!]$/.test(p.t)).length;
      if (dots && dots !== points.length) {
        const few = dots < points.length / 2;
        say("consistent", 3, `${few ? dots : points.length - dots} of ${points.length} lines ${few ? "end" : "don’t end"} with a full stop`, "Pick one way and use it everywhere.",
          at(points.find((p) => /[.!]$/.test(p.t) === few)));
        found[found.length - 1].fix = "stops";
      } else good.push("Punctuation is consistent");
      const tally = {};
      points.forEach((p) => { const v = first(p.t); if (v) (tally[v] = tally[v] || []).push(p); });
      Object.entries(tally).filter(([, list]) => list.length > 3).slice(0, 3).forEach(([v, list]) =>
        say("consistent", 1.5, `${list.length} lines start with “${v[0].toUpperCase() + v.slice(1)}”`, "Vary the verbs so each line reads fresh.", at(list[list.length - 1])));
    }
    work.forEach((w) => { if (!w.startDate) say("consistent", 2, `“${w.position || w.name}” has no start date`, "", { section: "work", i: r.work.indexOf(w), field: "startDate" }); });
    for (let n = 0; n + 1 < work.length; n++) {
      const from = months(work[n].startDate), before = months(work[n + 1].endDate);
      if (from != null && before != null && from - before > 6) {
        say("consistent", 1, `A gap of ${from - before} months before “${work[n].position || work[n].name}”`, "Fine if it is true; be ready to explain it, or add what you did then.", { section: "work", i: r.work.indexOf(work[n]) });
      }
    }
    if (/\s{2,}/.test(sum) || points.some((p) => / {2,}/.test(p.t))) { say("consistent", 1, "There are double spaces in the text", "", { section: "basics", field: "summary" }); found[found.length - 1].fix = "spaces"; }
    const small = points.filter((p) => /^[a-z]/.test(p.t));
    if (small.length) { say("consistent", Math.min(3, small.length), `${small.length} line${small.length === 1 ? " starts" : "s start"} with a small letter`, "", at(small[0])); found[found.length - 1].fix = "caps"; }
    const sp = spelling(texts(r).join("\n"));
    if (sp.uk && sp.us) {
      say("consistent", 2, `British and American spelling are mixed (${sp.ukWord} and ${sp.usWord})`, `Pick one. Fix all uses ${sp.uk >= sp.us ? "British" : "American"} spelling, the one you use most.`, {});
      found[found.length - 1].fix = "spelling";
    }

    // ---- ats
    if (o.ats === "low") say("ats", 6, "This design is made for people, not upload forms", "Send it by email or hand it over. For online application forms, keep a version in an ATS-safe design.", { design: true });
    else if (o.ats === "medium") say("ats", 2, "This design has columns", "Most application systems cope; a few read the columns out of order. Keep an ATS-safe version for upload forms.", { design: true });
    else good.push("The design reads cleanly in application systems");
    if ((o.renamed || []).length) say("ats", 2, `Unusual heading: “${o.renamed[0]}”`, "Application systems look for standard headings such as Experience, Education and Skills.", {});
    if (work.some((w) => !w.position || !w.name)) say("ats", 2, "A role is missing its title or company", "", { section: "work", i: r.work.findIndex((w) => !w.position || !w.name) });

    const PARTS = [["complete", "Complete", 25], ["impact", "Impact", 30], ["brief", "Brevity", 15], ["consistent", "Consistency", 15], ["ats", "ATS readiness", 15]];
    const parts = PARTS.map(([id, name, max]) => ({ id, name, max,
      got: Math.max(0, Math.round(max - found.filter((f) => f.part === id).reduce((n, f) => n + f.weight, 0))) }));
    if (!points.length) parts[1].got = work.length ? 8 : student ? 18 : 0;      // nothing to judge yet
    found.sort((x, y) => y.weight - x.weight);
    return { score: parts.reduce((n, p) => n + p.got, 0), parts, findings: found, good };
  }

  /* ---- one-click fixes (the check's "Fix all"). Each works on the text a reader sees and returns how many changed. */
  const ISE = "organ|optim|prior|util|standard|modern|custom|recogn|minim|maxim|real|summar|capital|central|special|monet|digit|visual|character|categor|synchron|stabil|normal|final|mobil|emphas|apolog|critic|famil";
  const PAIRS = [["colour", "color"], ["behaviour", "behavior"], ["centre", "center"], ["labour", "labor"], ["favour", "favor"], ["honour", "honor"],
    ["modelling", "modeling"], ["travelled", "traveled"], ["cancelled", "canceled"], ["catalogue", "catalog"], ["defence", "defense"], ["licence", "license"]];
  const UK_RE = new RegExp("\\b(?:(?:" + ISE + ")is(?:e|ed|es|ing|ation|ations)|analys(?:e|ed|es|ing)|" + PAIRS.map((p) => p[0]).join("|") + ")\\b", "gi");
  const US_RE = new RegExp("\\b(?:(?:" + ISE + ")iz(?:e|ed|es|ing|ation|ations)|analyz(?:e|ed|es|ing)|" + PAIRS.map((p) => p[1]).join("|") + ")\\b", "gi");
  function spelling(text) {
    const uk = text.match(UK_RE) || [], us = text.match(US_RE) || [];
    return { uk: uk.length, us: us.length, ukWord: uk[0], usWord: us[0] };
  }
  const keepCase = (from, to) => (from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);
  const toUS = (w) => { const l = w.toLowerCase(), p = PAIRS.find((x) => x[0] === l); return keepCase(w, p ? p[1] : l.replace(/is(e|ed|es|ing|ation|ations)$/, "iz$1").replace(/^analys/, "analyz")); };
  const toUK = (w) => { const l = w.toLowerCase(), p = PAIRS.find((x) => x[1] === l); return keepCase(w, p ? p[0] : l.replace(/iz(e|ed|es|ing|ation|ations)$/, "is$1").replace(/^analyz/, "analys")); };

  /* Every free text in the resume, as [object, key] pairs for the lines and summaries a fix may touch. */
  function spots(r) {
    const out = [];
    if (r.basics && typeof r.basics.summary === "string") out.push([r.basics, "summary"]);
    for (const k of ["work", "projects", "volunteer"]) for (const w of r[k] || []) {
      for (const f of ["summary", "description"]) if (typeof w[f] === "string") out.push([w, f]);
      (w.highlights || []).forEach((_, i) => out.push([w.highlights, i]));
    }
    return out;
  }
  const texts = (r) => spots(r).map(([o, k]) => String(o[k] || ""));
  const lineSpots = (r) => spots(r).filter(([o]) => Array.isArray(o));

  function fix(resume, id) {
    let n = 0;
    const set = (o, k, v) => { if (o[k] !== v) { o[k] = v; n++; } };
    if (id === "spaces") spots(resume).forEach(([o, k]) => set(o, k, String(o[k]).replace(/[ \t]{2,}/g, " ").replace(/ +$/gm, "")));
    if (id === "caps") lineSpots(resume).forEach(([o, k]) => set(o, k, String(o[k]).replace(/^(\s*)([a-z])/, (m, a, c) => a + c.toUpperCase())));
    if (id === "stops") {
      const lines = lineSpots(resume).filter(([o, k]) => String(o[k]).trim());
      const dots = lines.filter(([o, k]) => /[.!]\s*$/.test(o[k])).length;
      const want = dots >= lines.length / 2;
      lines.forEach(([o, k]) => set(o, k, want ? String(o[k]).replace(/\s*$/, "").replace(/([^.!?:;])$/, "$1.") : String(o[k]).replace(/\.\s*$/, "")));
    }
    if (id === "spelling") {
      const sp = spelling(texts(resume).join("\n")), us = sp.us > sp.uk;
      spots(resume).forEach(([o, k]) => set(o, k, String(o[k]).replace(us ? UK_RE : US_RE, us ? toUS : toUK)));
    }
    return n;
  }

  /* Hints for the one point being typed (the coach under the focused point): at most two, most useful first.
   * Each is {tone: "fix" | "tip" | "ok", text}. Same rules as the check, so the score agrees with the coach. */
  function point(text) {
    const t = String(text || "").replace(/\*\*/g, "").trim();
    if (!t) return [{ tone: "tip", text: "Open with what you did: Built, Led, Cut, Launched…" }];
    const out = [], low = t.toLowerCase();
    if (WEAK.some((re) => re.test(t))) out.push({ tone: "fix", text: "Starts weakly: open with what you did (Built, Led, Cut…)" });
    else if (t.length > 14 && !verbs.has(first(t))) out.push({ tone: "tip", text: "Open with an action verb in the past tense" });
    if (/(^|\s)(I|my|me|we|our)(\s|$)/.test(t)) out.push({ tone: "fix", text: "Drop I, my and we" });
    if (t.length > 230) out.push({ tone: "fix", text: `Runs long (${t.length} characters): keep it to one or two lines` });
    const buzz = BUZZ.find((w) => low.includes(w));
    if (buzz) out.push({ tone: "tip", text: `“${buzz}” says little: show a result instead` });
    if (t.length >= 25 && !hasNumber(t)) out.push({ tone: "tip", text: "Add a number: how much, how many, how fast" });
    if (!out.length && t.length < 25) out.push({ tone: "tip", text: "Say what came of it" });
    if (!out.length) out.push({ tone: "ok", text: "Strong line: an action, a number, a good length" });
    return out.sort((a, b) => (a.tone === "fix" ? 0 : 1) - (b.tone === "fix" ? 0 : 1)).slice(0, 2);
  }

  window.Smart = Object.assign(window.Smart || {}, { check, point, fix, VERBS });
})();
