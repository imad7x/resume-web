/* Job match: how well a resume fits one job ad. Rules only, no AI and no network.
 *
 *   Smart.match(resume, target) -> null when there is no ad yet, else
 *     { score: 0..100, role: {key, label} | null,
 *       skills: {have: [label], missing: [label]},        skills the ad asks for (7xjobs' rules + MORE)
 *       words:  {have: [term],  missing: [term]},         other words the ad repeats
 *       checks: [{ok, text, why, at}],                     years, degree, title
 *       lines:  [{text, hits: [term], at}],                the resume's lines that speak to this ad, best first
 *       quiet:  [{name, at}] }                             roles with no line that speaks to it
 *   Smart.roleOf(title) -> {key, label} | null            7xjobs' title rules (data/jobrules.js)
 *   Smart.skillsIn(text) -> [label]                       every known skill named in a text
 *
 * The skill rules are 7xjobs' own (tools/sync-7xjobs.py), so a skill found here is the skill 7xjobs counts in its
 * jobs. MORE adds the fields 7xjobs' list is thin on (health, law, finance, sales, people, operations, teaching).
 */
(function () {
  "use strict";
  const R = window.JOBRULES || { skills: [], roles: [] };
  const MORE = [
    ["patient-care", "Patient care", "\\bpatient care\\b|\\bbedside\\b"], ["bls", "BLS / ACLS", "\\b(?:bls|acls|pals)\\b"],
    ["ehr", "EMR / EHR", "\\b(?:emr|ehr)\\b|electronic (?:medical|health) records?|\\bepic\\b(?= (?:emr|ehr|systems?))|\\bcerner\\b"],
    ["icu", "Critical care (ICU)", "\\bicu\\b|critical care|intensive care"], ["triage", "Triage", "\\btriage\\b"],
    ["infection", "Infection control", "infection (?:control|prevention)"], ["hipaa", "HIPAA", "\\bhipaa\\b"],
    ["clinical-research", "Clinical research", "clinical (?:research|trials?)"], ["pv", "Pharmacovigilance", "pharmacovigilance|drug safety"],
    ["coding-med", "Medical coding", "medical coding|\\bicd-?10\\b|\\bcpt\\b"], ["phlebotomy", "Phlebotomy", "phlebotomy"],
    ["litigation", "Litigation", "\\blitigation\\b"], ["drafting", "Contract drafting", "(?:contract|legal) drafting|drafting (?:of )?(?:contracts|agreements)"],
    ["legal-research", "Legal research", "legal research"], ["compliance", "Compliance", "\\bcompliance\\b|\\bregulatory\\b"],
    ["due-diligence", "Due diligence", "due diligence"], ["arbitration", "Arbitration", "\\barbitration\\b"],
    ["ip-law", "Intellectual property", "intellectual property|\\bpatents?\\b|\\btrademarks?\\b"],
    ["fin-model", "Financial modelling", "financial model(?:l)?ing|financial models?\\b"], ["accounting", "Accounting", "\\baccounting\\b|\\bbookkeeping\\b"],
    ["gaap", "GAAP / IFRS", "\\b(?:us )?gaap\\b|\\bifrs\\b|\\bind ?as\\b"], ["tally", "Tally", "\\btally\\b(?: ?erp| prime)?"],
    ["gst", "GST and tax", "\\bgst\\b|\\btds\\b|\\btaxation\\b|income tax"], ["audit", "Audit", "\\baudit(?:s|ing)?\\b"],
    ["budgeting", "Budgeting and forecasting", "\\bbudget(?:s|ing)\\b|\\bforecasting\\b"], ["fpa", "FP&A", "\\bfp&a\\b|financial planning (?:and|&) analysis"],
    ["recon", "Reconciliation", "reconciliation"], ["ap-ar", "Accounts payable / receivable", "accounts (?:payable|receivable)"],
    ["risk", "Risk management", "risk (?:management|assessment|analysis)"], ["kyc", "KYC / AML", "\\bkyc\\b|\\baml\\b|anti-money laundering"],
    ["credit", "Credit analysis", "credit (?:analysis|appraisal|underwriting|risk)|\\bunderwriting\\b"], ["valuation", "Valuation", "\\bvaluations?\\b|\\bdcf\\b"],
    ["crm", "CRM", "\\bcrm\\b"], ["leadgen", "Lead generation", "lead generation|\\bprospecting\\b"], ["negotiation", "Negotiation", "negotiat(?:ion|ing|e)"],
    ["bizdev", "Business development", "business development"], ["key-accounts", "Account management", "(?:key )?account management|client relationships?"],
    ["content-mkt", "Content marketing", "content (?:marketing|strategy)"], ["social", "Social media", "social media"],
    ["ga", "Google Analytics", "google analytics|\\bga4\\b"], ["ads", "Google Ads", "google ads|\\badwords\\b|\\bppc\\b|paid search"],
    ["email-mkt", "Email marketing", "email marketing|\\bemail campaigns?\\b"], ["copywriting", "Copywriting", "copywriting|\\bcopywriter\\b"],
    ["brand", "Brand management", "brand (?:management|strategy)"], ["market-research", "Market research", "market research|competitive analysis"],
    ["pr", "Public relations", "public relations|media relations"],
    ["recruitment", "Recruitment", "\\brecruit(?:ment|ing)\\b|talent acquisition|\\bsourcing\\b"], ["onboarding", "Onboarding", "\\bonboarding\\b"],
    ["payroll", "Payroll", "\\bpayroll\\b"], ["employee-relations", "Employee relations", "employee (?:relations|engagement)"],
    ["perf-mgmt", "Performance management", "performance (?:management|appraisals?|reviews)"], ["hris", "HRIS", "\\bhris\\b|\\bhrms\\b|\\bworkday\\b|successfactors"],
    ["comp-ben", "Compensation and benefits", "compensation (?:and|&) benefits|\\bc&b\\b"], ["labour-law", "Labour law", "labou?r laws?|employment law"],
    ["supply-chain", "Supply chain", "supply chain"], ["logistics", "Logistics", "\\blogistics\\b"], ["procurement", "Procurement", "\\bprocurement\\b|\\bpurchasing\\b|\\bsourcing strateg"],
    ["inventory", "Inventory management", "inventory (?:management|control|planning)"], ["vendor", "Vendor management", "vendor (?:management|relations)|supplier management"],
    ["six-sigma", "Six Sigma / Lean", "six sigma|\\blean (?:manufacturing|principles|management|methodolog\\w*)\\b|\\bkaizen\\b"],
    ["erp", "ERP", "\\berp\\b|oracle (?:ebs|fusion)|netsuite"], ["warehouse", "Warehouse operations", "\\bwarehous(?:e|ing)\\b"],
    ["demand-planning", "Demand planning", "demand (?:planning|forecasting)|\\bs&op\\b"], ["process", "Process improvement", "process (?:improvement|optimi[sz]ation|excellence)"],
    ["pm", "Project management", "project management|\\bpmp\\b|\\bprince2\\b"], ["scrum", "Scrum", "\\bscrum\\b"],
    ["stakeholders", "Stakeholder management", "stakeholder (?:management|engagement|communication)|\\bstakeholders\\b"],
    ["roadmap", "Roadmapping", "\\broadmaps?\\b|\\broadmapping\\b"], ["requirements", "Requirements gathering", "requirements? (?:gathering|analysis|elicitation)|\\bbrds?\\b"],
    ["lesson", "Lesson planning", "lesson plan(?:s|ning)?"], ["curriculum", "Curriculum development", "curriculum (?:development|design|planning)"],
    ["classroom", "Classroom management", "classroom management"], ["cbse", "CBSE / ICSE / IB", "\\bcbse\\b|\\bicse\\b|\\bigcse\\b|\\bib (?:curriculum|diploma|pyp|myp)\\b"],
    ["writing", "Writing and editing", "\\b(?:technical )?writing\\b|\\bediting\\b|\\bproofreading\\b"], ["video", "Video editing", "video editing|premiere pro|final cut|after effects"],
    ["canva", "Canva", "\\bcanva\\b"], ["office", "Microsoft Office", "ms office|microsoft office|\\bpowerpoint\\b|\\bms word\\b|microsoft word"],
    ["communication", "Communication", "communication skills|\\bcommunicat(?:e|ion|ing)\\b"], ["leadership", "Leadership", "\\bleadership\\b|\\bled (?:a )?team"],
    ["team-mgmt", "Team management", "team management|people management|managing (?:a )?team|manage (?:a )?team"], ["mentoring", "Mentoring", "\\bmentor(?:ing|ed|ship)?\\b|\\bcoaching\\b"],
    ["presentation", "Presentations", "\\bpresentations?\\b|public speaking"], ["problem-solving", "Problem solving", "problem[- ]solving|analytical skills"],
    ["customer-service", "Customer service", "customer (?:service|support|experience)|client servicing"], ["data-analysis", "Data analysis", "data analysis|analy[sz]ing data"],
  ].map(([k, label, p]) => [k, label, p, false]);
  const compile = (list) => list.map(([k, label, p, cs]) => { try { return { k, label, re: new RegExp(p, cs ? "g" : "gi") }; } catch (e) { return null; } }).filter(Boolean);
  const SKILLS = compile((R.skills || []).concat(MORE));
  const ROLES = (R.roles || []).map(([k, label, p]) => { try { return { k, label, re: new RegExp(p, "i") }; } catch (e) { return null; } }).filter(Boolean);
  const DEVOPS_FIRST = /devops|devsecops|\bsre\b|site reliability/i;

  const STOP = new Set(("a about above across after again against all also am an and any are as at be because been before being below between both but by can "
    + "could did do does doing down during each etc few for from further had has have having he her here hers him his how i if in into is it its itself "
    + "just me more most my no nor not now of off on once only or other our ours out over own per same she should so some such than that the their them "
    + "then there these they this those through to too under until up upon us very via was we were what when where which while who whom why will with "
    + "within without would you your yours able ability across active additional advantage apply applicants applying based benefits best better big "
    + "bonus candidate candidates career careers clear closely company competitive core culture day days deep degree desired different drive driven "
    + "e.g eg employer employment ensure environment equal excellent exceptional excited existing experience experienced expertise familiarity fast "
    + "full good great grow growing growth hands help high highly hiring ideal impact including industry information join key knowledge large learn "
    + "learning level like location looking make making manage managing minimum must need needed new nice offer office opportunities opportunity "
    + "part people plus position preferred proficiency proficient proven qualification qualifications related relevant remote required requirement "
    + "requirements responsibilities responsible role roles salary see seeking senior similar skill skills solid solutions strong success successful "
    + "support take team teams time today tools understanding use using value values various way ways well work working world year years "
    + "ll ve re s t don won apply get go one two three five ten first within least etc job jobs looking").split(" "));
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stem = (w) => (w.length > 5 ? w.replace(/(?:ing|ed|es|s|ment|ments)$/, "") : w.length > 3 ? w.replace(/s$/, "") : w);
  const months = (d) => { const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(d || ""); return m ? +m[1] * 12 + (m[2] ? +m[2] - 1 : 0) : null; };

  /* Every string in the resume that a reader sees, one per line (contact details left out). */
  function textOf(resume) {
    const out = [];
    const walk = (v, key) => {
      if (v == null || /^(email|phone|url|image|countryCode|startDate|endDate|date|releaseDate|hidden)$/.test(key || "")) return;
      if (typeof v === "string") { if (v.trim()) out.push(v.replace(/\*\*/g, "")); }
      else if (Array.isArray(v)) v.forEach((x) => walk(x, ""));
      else if (typeof v === "object") { if (v.hidden) return; for (const [k, x] of Object.entries(v)) walk(x, k); }
    };
    walk(resume, "");
    return out.join("\n");
  }

  function skillsIn(text) {
    const found = new Map();
    for (const s of SKILLS) {
      s.re.lastIndex = 0;
      const n = (String(text).match(s.re) || []).length;
      if (n) found.set(s.label, (found.get(s.label) || 0) + n);
    }
    return found;
  }

  function roleOf(title) {
    const t = String(title || "");
    if (!t.trim()) return null;
    if (DEVOPS_FIRST.test(t)) { const d = ROLES.find((r) => r.k === "devops"); if (d) return { key: d.k, label: d.label }; }
    const r = ROLES.find((x) => x.re.test(t));
    return r ? { key: r.k, label: r.label } : null;
  }

  /* The words an ad leans on that aren't skills already: pairs of words said twice or more, then single words, then
   * short capitals said once (HIPAA, SOC2). At most 12. */
  function wordsOf(jd, skillLabels) {
    const said = new Map(), pairs = new Map(), caps = new Set();
    for (const sentence of jd.split(/[.;:!?()\n•·|,/]+/)) {
      const words = sentence.match(/[A-Za-z][A-Za-z+#.-]*[A-Za-z+#]|[A-Za-z]/g) || [];
      let prev = null;
      for (const raw of words) {
        const w = raw.toLowerCase();
        if (/^[A-Z][A-Z0-9]{1,5}$/.test(raw) && !STOP.has(w)) caps.add(raw);
        if (STOP.has(w) || w.length < 3) { prev = null; continue; }
        said.set(w, (said.get(w) || 0) + 1);
        if (prev) pairs.set(prev + " " + w, (pairs.get(prev + " " + w) || 0) + 1);
        prev = w;
      }
    }
    const known = skillLabels.map((l) => l.toLowerCase());
    const covered = (t) => known.some((k) => k.includes(t) || t.includes(k)) || SKILLS.some((s) => { s.re.lastIndex = 0; return s.re.test(t); });
    const out = [], used = new Set();
    [...pairs].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).forEach(([t]) => {
      if (out.length < 6 && !covered(t)) { out.push(t); t.split(" ").forEach((w) => used.add(w)); }
    });
    [...said].filter(([w, n]) => n >= 2 && !used.has(w)).sort((a, b) => b[1] - a[1]).forEach(([w]) => {
      if (out.length < 10 && !covered(w)) out.push(w);
    });
    [...caps].forEach((c) => { if (out.length < 12 && !covered(c.toLowerCase()) && !out.includes(c.toLowerCase())) out.push(c); });
    return out;
  }
  const has = (text, term) => {
    const parts = term.toLowerCase().split(" ").map((w) => esc(stem(w)));
    return new RegExp("(?:^|[^a-z0-9])" + parts.join("[a-z]*\\s+") + "[a-z]*", "i").test(text);
  };

  const EDU = [[3, /\bph\.?\s?d\b|doctorate/i], [2, /\bmaster'?s?\b|\bmba\b|\bm\.?\s?tech\b|\bm\.?\s?sc\b|\bmca\b|\bm\.?\s?com\b|post-?graduat|\bpgdm\b|\bllm\b/i],
    [1, /\bbachelor'?s?\b|\bb\.?\s?tech\b|\bb\.?\s?e\b\.?(?=\s|,|$)|\bb\.?\s?sc\b|\bbca\b|\bb\.?\s?com\b|\bllb\b|\bmbbs\b|\bb\.?\s?pharm|\bgraduate\b|\bdegree\b/i]];
  const eduLevel = (text, pick) => { const found = EDU.filter(([, re]) => re.test(text)).map(([n]) => n); return found.length ? pick(...found) : 0; };
  const EDU_NAME = { 1: "a bachelor's degree", 2: "a master's degree", 3: "a PhD" };

  function yearsOf(work) {
    const now = new Date().getFullYear() * 12 + new Date().getMonth();
    const spans = work.filter((w) => !w.hidden).map((w) => [months(w.startDate), months(w.endDate) || now]).filter(([a, b]) => a != null && b >= a)
      .sort((x, y) => x[0] - y[0]);
    let total = 0, end = -1;
    for (const [a, b] of spans) { if (b > end) { total += b - Math.max(a, end); end = b; } }
    return total / 12;
  }

  function match(resume, target) {
    const t = target || {}, jd = String(t.jd || "").trim();
    if (jd.length < 40) return null;
    const r = resume || {}, b = r.basics || {}, work = (r.work || []).filter((w) => !w.hidden);
    const text = textOf(r);
    const asked = skillsIn(jd), mine = skillsIn(text);
    const must = jd.split(/\n|\.\s/).filter((l) => /\b(must|required|requirements?|mandatory|need to have|you have|minimum)\b/i.test(l)).join("\n");
    const mustSkills = skillsIn(must);
    const weight = (label) => (asked.get(label) >= 2 || mustSkills.has(label) ? 2 : 1);
    const skills = { have: [], missing: [] };
    [...asked.keys()].sort((x, y) => weight(y) - weight(x)).forEach((l) => skills[mine.has(l) ? "have" : "missing"].push(l));
    const terms = wordsOf(jd, [...asked.keys()]);
    const words = { have: terms.filter((w) => has(text, w)), missing: terms.filter((w) => !has(text, w)) };

    const sw = [...asked.keys()].reduce((n, l) => n + weight(l), 0), sh = skills.have.reduce((n, l) => n + weight(l), 0);
    const sPart = sw ? sh / sw : null, wPart = terms.length ? words.have.length / terms.length : null;
    let score = sPart == null && wPart == null ? 0 : sPart == null ? wPart : wPart == null ? sPart : sPart * 0.7 + wPart * 0.3;

    const checks = [];
    const yr = /(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?\+?\s*(?:years?|yrs?)(?:'|’)?\s*(?:of\s+)?(?:[a-z/&-]+\s+){0,4}?(?:experience|exp\b)/i.exec(jd);
    if (yr) {
      const need = +yr[1], got = yearsOf(work), shown = got >= 1 ? Math.floor(got) + (got % 1 >= 0.5 ? ".5" : "") + (got >= 1 && got < 1.5 ? " year" : " years") : "under a year";
      const ok = got >= need - 0.5;
      checks.push({ ok, text: ok ? `${need}+ years asked; your roles add up to ${shown}` : `The ad asks for ${need}+ years; your roles add up to ${shown}`,
        why: ok ? "" : "Count internships, freelance work and projects if they are real experience, or aim at a more junior opening.", at: { section: "work" } });
      if (!ok) score -= 0.08;
    }
    const needEdu = eduLevel(jd, Math.min), gotEdu = eduLevel((r.education || []).filter((e) => !e.hidden).map((e) => [e.studyType, e.area, e.institution].join(" ")).join("\n"), Math.max);
    if (needEdu) {
      const ok = gotEdu >= needEdu;
      checks.push({ ok, text: ok ? `Asks for ${EDU_NAME[needEdu]}; your education shows it` : `Asks for ${EDU_NAME[needEdu]}; your education doesn't show one`,
        why: ok ? "" : "If you have it, name the degree in Education (Bachelor of…, B.Tech, MBA…).", at: { section: "education" } });
      if (!ok) score -= 0.05;
    }
    const want = String(t.role || "").trim(), headline = String(b.label || "").trim(), latest = work[0] ? String(work[0].position || "") : "";
    const role = roleOf(want) || roleOf(jd.split("\n")[0]);
    if (want) {
      const key = want.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP.has(w));
      const mineRole = roleOf(headline) || roleOf(latest);
      const inHead = key.length && key.every((w) => has(headline + " " + latest, w));
      const same = role && mineRole && role.key === mineRole.key;
      checks.push({ ok: !!(inHead || same),
        text: inHead ? `Your headline or latest title matches “${want}”` : same ? `Your title is the same kind of role (${role.label})`
          : headline ? `Your headline says “${headline}”; the job is “${want}”` : `No headline under your name; the job is “${want}”`,
        why: inHead ? "" : "Recruiters and application systems compare titles first. If it is true for you, put the job's title in your headline.",
        at: { section: "basics", field: "label" } });
      if (!inHead) score -= same ? 0.02 : 0.06;
    }
    score = Math.max(0, Math.min(1, score));

    const terms2 = [...asked.keys()].map((l) => SKILLS.filter((s) => s.label === l)).flat();
    const lines = [], quiet = [];
    (r.work || []).forEach((w, i) => {
      if (w.hidden) return;
      let any = false;
      (w.highlights || []).forEach((line, index) => {
        const hits = [...new Set(terms2.filter((s) => { s.re.lastIndex = 0; return s.re.test(line); }).map((s) => s.label)
          .concat(terms.filter((x) => has(line, x))))];
        if (hits.length) { any = true; lines.push({ text: String(line).replace(/\*\*/g, ""), hits, at: { section: "work", i, field: "highlights", index } }); }
      });
      if (!any && (w.highlights || []).some((x) => String(x).trim())) quiet.push({ name: w.position || w.name || "A role", at: { section: "work", i } });
    });
    lines.sort((x, y) => y.hits.length - x.hits.length);
    return { score: Math.round(score * 100), role, skills, words, checks, lines: lines.slice(0, 5), quiet };
  }

  /* ---- the phrase library (data/phrases.js) */
  const P = () => window.PHRASES || { families: {}, general: [] };
  /* The family of lines for a title ("Staff Nurse" -> healthcare), or null. */
  function familyOf(title) {
    const role = roleOf(title);
    if (!role) return null;
    const fams = P().families;
    const key = Object.keys(fams).find((k) => fams[k].roles.includes(role.key));
    return key ? { key, name: fams[key].name } : null;
  }
  /* The resume's own family: its headline first, then the latest titles. */
  function familyOfResume(r) {
    const b = (r && r.basics) || {};
    for (const t of [b.label].concat(((r && r.work) || []).map((w) => w.position))) { const f = familyOf(t); if (f) return f; }
    return null;
  }
  /* Skills to consider for a family that the resume doesn't list yet. */
  function skillIdeas(r, key) {
    const f = P().families[key];
    if (!f) return [];
    const text = textOf(r).toLowerCase();
    const listed = new Set(skillsIn(textOf(r)).keys());
    return f.skills.filter((l) => !listed.has(l) && !text.includes(l.toLowerCase()));
  }
  const list3 = (xs) => (xs.length > 2 ? xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1] : xs.join(" and "));
  const as = (w) => (/^\[/.test(w) ? w : (/^[aeiou]/i.test(w) ? "an " : "a ") + w);
  /* Three summary drafts from what the resume already says. Parts in [brackets] are for the person to fill in. */
  function summaries(r) {
    const b = (r && r.basics) || {}, work = ((r && r.work) || []).filter((w) => !w.hidden);
    const years = Math.floor(yearsOf(work));
    const skills = [...new Set((r.skills || []).flatMap((g) => g.keywords || []).map(String).filter(Boolean))].slice(0, 3);
    const sk = skills.length ? list3(skills) : "[your three strongest skills]";
    const latest = work[0] || {}, role = String(b.label || latest.position || "[the job you want]").trim();
    const where = latest.name ? ` at ${latest.name}` : "";
    const edu = ((r.education || []).filter((e) => !e.hidden)[0]) || {};
    if (years < 1) {
      const study = [edu.studyType, edu.area].filter(Boolean).join(" in ") || "[your degree]";
      return [`${study} graduate${edu.institution ? " from " + edu.institution : ""} with hands-on work in ${sk} through [projects / internships]. Looking for a first role as ${as(role)}.`,
        `Recent ${study} graduate. Built [project] using ${sk}, [result: e.g. used by N people]. Ready to start as ${as(role)}.`,
        `Starting out as ${as(role)}, with ${sk} from [course / internship]. Quick to learn: [one thing you did that proves it].`];
    }
    const yrs = years === 1 ? "1 year" : `${years} years`;
    return [`${role} with ${yrs} of experience${where ? ", most recently" + where : ""}. Strongest in ${sk}. [One result you are proud of, with a number].`,
      `${yrs} as ${as(role)}, working with ${sk}. Known for [what colleagues come to you for]; [one result with a number].`,
      `${role} who [what you do best, in a few words]. ${yrs} of experience${where}, using ${skills.slice(0, 2).length ? list3(skills.slice(0, 2)) : sk}. Looking for [the kind of role or team you want next].`];
  }

  window.Smart = Object.assign(window.Smart || {}, { familyOf, familyOfResume, skillIdeas, summaries, match, roleOf, skillsIn: (t) => [...skillsIn(t).keys()], textOf });
})();
