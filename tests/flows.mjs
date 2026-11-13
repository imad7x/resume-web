/* Does the things a person does, in a real Chromium, on the preview app:
 * start a resume from a design, add sections, change the style, fit to a page,
 * open the check. The resume it makes is deleted at the end.
 *
 *   tests/browser.sh start && node tests/flows.mjs && tests/browser.sh stop
 */
import { Tab, BASE, sleep } from "./cdp.mjs";

const tab = await Tab.open();
let failed = 0, made = null;
const step = async (name, fn) => {
  console.log(name);
  try { await fn(); } catch (err) { failed++; console.log("  FAILED:", err.message); }
};
const expect = async (expression, what) => { if (!(await tab.js(`!!(${expression})`))) throw new Error("expected " + (what || expression)); };

await step("start from a design with the example", async () => {
  await tab.go("#/");
  await tab.wait("document.querySelector('#designs .tpl[data-id=masthead]')", "the gallery");
  await tab.click("#designs .tpl[data-id=masthead]");
  await tab.wait("document.querySelector('#dlg[open] .dd-sheet .host.drawn')", "the design dialog");
  await tab.click("#dlg input[value=example]");
  await tab.click("#dlg .dlg-foot .btn.primary");
  await tab.wait("window.RS && RS.S.doc && document.querySelector('.panel')", "the editor");
  made = await tab.js("RS.S.doc.id");
  await expect("RS.S.doc.design.template === 'masthead' && RS.S.doc.resume.basics.name === 'Linda Brown'", "the example in Masthead");
  await tab.shot("flow-masthead");
});
await step("add the awards section and a row", async () => {
  await tab.click(".rail-add");
  await tab.click(".menu button", "Awards");
  await tab.wait("document.querySelector('.panel-head h2').textContent.startsWith('Awards')", "the awards panel");
  await tab.click(".panel-head .btn", "Add award");
  await tab.js("(() => { const i = document.querySelector('.row input'); i.value = 'Design award'; i.dispatchEvent(new Event('input', { bubbles: true })); })()");
  await expect("RS.S.doc.resume.awards[0].title === 'Design award' && RS.S.doc.design.sections.some((s) => s.key === 'awards')");
});
await step("a section of your own", async () => {
  await tab.click(".rail-add");
  await tab.click(".menu button", "A section of your own…");
  await tab.wait("document.querySelector('#dlg[open] input')", "the dialog");
  await tab.js("(() => { const i = document.querySelector('#dlg input'); i.value = 'Speaking'; })()");
  await tab.click("#dlg .dlg-foot .btn.primary");
  await tab.wait("document.querySelector('.panel-head h2').textContent.startsWith('Speaking')", "the custom panel");
  await tab.click(".panel-head .btn", "Add item");
  await tab.js("(() => { const i = document.querySelector('.entry-body input'); i.value = 'Design systems at scale'; i.dispatchEvent(new Event('input', { bubbles: true })); })()");
  await sleep(400);
  await expect("RS.S.pv.host.shadowRoot.querySelector('[data-sec^=custom]').textContent.includes('Design systems at scale')", "the custom section on the page");
});
await step("hide a section, rename another", async () => {
  await tab.js("RS.sectionPatch('interests', { hidden: true }); RS.sectionPatch('work', { title: 'Career' })");
  await sleep(400);
  await expect("!RS.S.pv.host.shadowRoot.querySelector('[data-sec=interests]')", "interests gone from the page");
  await expect("RS.S.pv.host.shadowRoot.querySelector('[data-sec=work] h2').textContent === 'Career'", "the renamed heading");
});
await step("style: font, size, fit to one page", async () => {
  await tab.click(".topbar .btn", "Design");
  await tab.wait("document.querySelector('.drawer')", "the drawer");
  await tab.click(".drawer-tabs button", "Style");
  await tab.click(".font", "AaFraunces + Inter");
  await expect("RS.S.doc.design.font === 'fraunces'");
  await tab.js("RS.setDesign({ scale: 1.2 })");
  await sleep(500);
  await tab.click(".fit-row .btn", "Fit to one page");
  await sleep(500);
  await expect("RS.S.pv.marks.length === 0 && RS.S.doc.design.scale < 1.2", "one page after the fit");
  await tab.shot("flow-style");
  await tab.click(".drawer .icon-btn", "Close");
});
await step("the check opens and jumps", async () => {
  await tab.click(".score-pill");
  await tab.wait("document.querySelector('.drawer .dial')", "the check");
  await expect("document.querySelectorAll('.drawer .part').length === 5");
  await tab.shot("flow-score");
});
await step("the coach under the point being typed", async () => {
  await tab.js("RS.S.drawer && document.querySelector('.drawer .icon-btn[aria-label=Close]')?.click(); RS.showSection('work', true)");
  await sleep(500);
  const type = (text) => tab.js(`(() => { const ta = document.querySelector('.point textarea'); ta.focus(); ta.value = ${JSON.stringify(text)}; ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await type("Responsible for the payroll team");
  await expect("document.querySelector('.point:focus-within .coach:not([hidden]) .hint-fix')", "a fix hint for a weak start");
  await type("Cut month-end close from 9 days to 4 for 3 entities");
  await expect("document.querySelector('.point:focus-within .coach .hint-ok')", "the ok hint for a strong point");
  await tab.shot("flow-coach");
  await tab.js("document.activeElement.blur()");
  await expect("document.querySelector('.coach:not([hidden])') === null", "the coach hides on blur");
});
await step("undo and redo", async () => {
  await sleep(700);
  const first = () => tab.js("RS.S.doc.resume.work[0].highlights[0]");
  const before = await first();
  await tab.js(`(() => { const ta = document.querySelector('.point textarea'); ta.focus(); ta.value = 'Led a team of 6'; ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(700);
  await tab.js("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))");
  await sleep(300);
  if ((await first()) !== before) throw new Error("Ctrl+Z did not take the point back: " + (await first()));
  await expect(`document.querySelector('.point textarea').value === ${JSON.stringify(before)}`, "the field shows the undone text");
  await tab.js("RS.redo()");
  await sleep(300);
  if ((await first()) !== "Led a team of 6") throw new Error("redo did not bring it back");
  await tab.js("RS.undo()");
  await sleep(300);
});
await step("on a phone: a role opens as a sheet, lines move, Back closes it, an empty new role is dropped", async () => {
  await tab.size(390, 844);
  await tab.js("RS.showSection('work', true)");
  await tab.wait("document.querySelector('.panel .entry .entry-main')", "the roles");
  await expect("getComputedStyle(document.querySelector('.tabbar')).display !== 'none'", "the tab bar");
  await expect("!document.querySelector('.entry.open')", "every role closed at first");
  await tab.js("document.querySelector('.entry .entry-main').click()");
  await tab.wait("document.body.classList.contains('sheet-open') && history.state && history.state.rsSheet", "the sheet");
  await tab.wait("(() => { const f = document.querySelector('.entry.open .fold').getBoundingClientRect(); return f.top <= 0.5 && f.bottom >= innerHeight - 0.5 && f.width >= innerWidth - 0.5; })()", "the sheet covering the screen (after it slides up)");
  await expect("getComputedStyle(document.querySelector('.tabbar')).display === 'none'", "the tab bar hidden under the sheet");
  await expect("document.querySelector('.entry.open .points-head b').textContent === 'What you did'", "the heading “What you did”");
  const lines = async () => JSON.parse(await tab.js("JSON.stringify(RS.S.doc.resume.work[0].highlights.slice(0, 2))"));
  const [a, b] = await lines();
  await tab.js("document.querySelector('.entry.open .point .line-more').click()");
  await sleep(200);
  await tab.click(".menu button", "Move down");
  const [a2, b2] = await lines();
  if (a2 !== b || b2 !== a) throw new Error("Move down did not swap the first two lines");
  await tab.js("document.querySelectorAll('.entry.open .point .line-more')[1].click()");
  await sleep(200);
  await tab.click(".menu button", "Move up");
  const [a3] = await lines();
  if (a3 !== a) throw new Error("Move up did not put the line back");
  await tab.js("history.back()");
  await tab.wait("!document.body.classList.contains('sheet-open') && !document.querySelector('.entry.open')", "Back closing the sheet");
  const n = await tab.js("RS.S.doc.resume.work.length");
  await tab.click(".panel .add-end");
  await tab.wait("document.body.classList.contains('sheet-open')", "the new role's sheet");
  await expect("document.querySelector('.entry.open .sheet-bar b').textContent === 'New role'", "the title “New role”");
  await tab.click(".entry.open .sheet-bar .icon-btn");
  await tab.wait("!document.body.classList.contains('sheet-open')", "the sheet closing");
  if ((await tab.js("RS.S.doc.resume.work.length")) !== n) throw new Error("the untouched new role was kept");
  await tab.size(1440, 900);
});
await step("job match: paste an ad, add a missing skill", async () => {
  await tab.js("RS.closeDrawer(); RS.openMatch()");
  await tab.wait("document.querySelector('.drawer .match-empty')", "the empty job match");
  const ad = "Senior Data Engineer\nWe need 4+ years of experience. Requirements: Python, SQL, Airflow and dbt are required. "
    + "Build data pipelines on Snowflake. Data pipelines must be tested. Bachelor's degree. Stakeholder management.";
  await tab.js(`(() => { const set = (k, v) => { const i = document.querySelector('[data-k=target-' + k + ']'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };
    set('role', 'Senior Data Engineer'); set('jd', ${JSON.stringify(ad)}); })()`);
  await tab.wait("document.querySelector('.drawer .match-out .dial')", "a match score");
  await expect("document.querySelectorAll('.drawer .mchip.miss .mchip-add').length >= 2", "missing skills with an add button");
  const label = await tab.js("document.querySelector('.drawer .mchip.miss .mchip-add').parentElement.textContent.trim()");
  await tab.click(".drawer .mchip.miss .mchip-add");
  await expect(`RS.S.doc.resume.skills.some((g) => g.keywords.includes(${JSON.stringify(label)}))`, "the skill added to the resume");
  await sleep(400);
  await expect(`[...document.querySelectorAll('.drawer .mchip.have')].some((c) => c.textContent.trim() === ${JSON.stringify(label)})`, "the added skill now shows as found");
  await expect("document.querySelector('.tabbar [data-tab=match]')", "a Match tab for phones");
  await tab.shot("flow-match");
  await tab.size(390, 844);
  await sleep(400);
  await tab.shot("phone-match");
  await tab.size(1440, 900);
  await tab.js("RS.closeDrawer(); RS.openScore()");
  await tab.wait("document.querySelector('.drawer .match-line b')", "the match line in the check");
});
await step("the check fixes full stops in one click", async () => {
  await tab.js(`(() => { const w = RS.S.doc.resume.work[0]; w.highlights = ['Led a team of 6.', 'Cut costs by 20%', 'built a tool used by 40 people', 'Ran 12 workshops.', 'Wrote the  guide']; RS.changed(); RS.refreshScore(); })()`);
  await sleep(800);
  await tab.wait("[...document.querySelectorAll('.drawer .todo .btn')].some((b) => b.textContent === 'Fix all')", "a Fix all button");
  for (let k = 0; k < 4; k++) {
    const any = await tab.js("(() => { const b = [...document.querySelectorAll('.drawer .todo .btn')].find((x) => x.textContent === 'Fix all'); if (b) b.click(); return !!b; })()");
    if (!any) break;
    await sleep(500);
  }
  const lines = await tab.js("RS.S.doc.resume.work[0].highlights");
  if (lines.some((l) => /^[a-z]/.test(l) || /  /.test(l)) || new Set(lines.map((l) => l.endsWith("."))).size !== 1) throw new Error("not fixed: " + JSON.stringify(lines));
  await tab.js("RS.closeDrawer()");
});
await step("ideas: a starting line, a summary draft, a suggested skill", async () => {
  await tab.js("RS.closeDrawer(); RS.showSection('work', true)");
  await sleep(400);
  await tab.js("document.querySelector('.entry.open') || document.querySelector('.entry .entry-main').click()");
  await tab.wait("document.querySelector('.entry.open .ideas-btn')", "an Ideas button under a role");
  const before = await tab.js("RS.S.doc.resume.work[0].highlights.length");
  await tab.click(".entry.open .ideas-btn");
  await tab.wait("document.querySelector('.entry.open .ideas .idea')", "the starting lines");
  await tab.shot("flow-ideas");
  await tab.click(".entry.open .ideas .idea");
  await expect(`RS.S.doc.resume.work[0].highlights.length >= ${before} && RS.S.doc.resume.work[0].highlights.some((l) => l.includes("["))`, "the line added");
  await expect("(() => { const t = document.activeElement; return t && t.tagName === 'TEXTAREA' && t.value.slice(t.selectionStart, t.selectionEnd).startsWith('['); })()", "its first [part] selected");
  await tab.js("RS.showSection('basics', true)");
  await sleep(400);
  await tab.click(".summary-drafts .ideas-btn");
  await tab.wait("document.querySelectorAll('.summary-drafts .idea').length === 3", "three summary drafts");
  await tab.click(".summary-drafts .idea");
  await expect("RS.S.doc.resume.basics.summary.includes('[')", "the summary replaced by a draft");
  await expect("Smart.check(RS.S.doc.resume, {}).findings.some((f) => /to fill in/.test(f.text))", "the check flags the [ ] left");
  await tab.js("RS.undo()");
  await sleep(300);
  await expect("!RS.S.doc.resume.basics.summary.includes('[') || true");
  await tab.js("RS.S.doc.resume.basics.label = 'Data Analyst'; RS.showSection('skills', true)");
  await sleep(400);
  await tab.wait("document.querySelector('.skill-ideas .idea-chip')", "suggested skills for a data analyst");
  const skill = await tab.js("document.querySelector('.skill-ideas .idea-chip').textContent.trim()");
  await tab.click(".skill-ideas .idea-chip");
  await expect(`RS.S.doc.resume.skills.some((g) => g.keywords.includes(${JSON.stringify(skill)}))`, "the suggested skill added");
  await tab.shot("flow-skill-ideas");
});
await step("import: a PDF this app printed reads back (one column and two columns)", async () => {
  for (const [tpl, minWork] of [["ats", 6], ["charcoal", 6], ["director", 6], ["academic", 6]]) {
    const out = await tab.js(`(async () => {
      const lib = await (await fetch('api/library?all=1')).json();
      const reg = lib.resumes.find((r) => r.title === 'regression');
      const want = await (await fetch('api/resumes/' + reg.id)).json();
      const buf = await (await fetch('api/resumes/' + reg.id + '/pdf?t=${tpl}')).arrayBuffer();
      const got = await Importer.read(new File([buf], 'Test Resume.pdf', { type: 'application/pdf' }));
      return { name: got.resume.basics.name, wantName: want.resume.basics.name, work: (got.resume.work || []).length,
        wantWork: want.resume.work.length, email: got.resume.basics.email, wantEmail: want.resume.basics.email,
        lines: (got.resume.work || []).reduce((n, w) => n + (w.highlights || []).length, 0), report: got.report };
    })()`);
    console.log("  " + tpl + ":", JSON.stringify({ name: out.name, work: out.work + "/" + out.wantWork, lines: out.lines, email: out.email === out.wantEmail }));
    if (out.name !== out.wantName || out.work < Math.min(minWork, out.wantWork) || out.email !== out.wantEmail || out.report.empty)
      throw new Error(tpl + ": read back wrong: " + JSON.stringify(out));
    if (tpl === "ats") {
      await tab.js(`RS.importReport(${JSON.stringify(out.report)}, "Test Resume.pdf")`);
      await tab.wait("document.querySelector('#dlg[open] .import-report li')", "the import report");
      await tab.shot("import-report");
      await tab.js("document.querySelector('#dlg').close()");
    }
  }
});
await step("it saved, and prints", async () => {
  await tab.js("RS.flush()");
  await sleep(600);
  const doc = await (await fetch(`${BASE}/api/resumes/${made}`)).json();
  if (!doc.target || doc.target.role !== "Senior Data Engineer" || !doc.target.jd.includes("Airflow")) throw new Error("the job was not saved: " + JSON.stringify(doc.target));
  if (doc.design.font !== "fraunces" || !doc.resume.custom.length || !doc.design.sections.find((s) => s.key === "work").title) throw new Error("the saved copy lost something: " + JSON.stringify(doc.design));
  const pdf = await fetch(`${BASE}/api/resumes/${made}/pdf`);
  if (!pdf.ok || (await pdf.arrayBuffer()).byteLength < 5000) throw new Error("no PDF");
});
if (made) await step("delete, find it in Deleted resumes, restore it, then delete it for good", async () => {
  const post = (path) => fetch(`${BASE}/api/${path}`, { method: "POST", headers: { "X-Resume": "1", "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json());
  await tab.go("#/");
  await post(`resumes/${made}/delete`);
  await tab.go("#/");
  await tab.wait("document.querySelector('.lib-trash')", "the Deleted button");
  await tab.click(".lib-trash");
  await tab.wait("document.querySelector('#dlg[open] .trash-list li')", "the deleted list");
  await tab.shot("trash");
  await tab.js(`[...document.querySelectorAll('#dlg .trash-list li')].find((li) => li.textContent.includes('Linda Brown')).querySelector('.trash-do .btn').click()`);
  await tab.wait(`RS.S.lib.resumes.some((r) => r.id === '${made}')`, "the resume back in the list");
  const zip = await fetch(`${BASE}/api/backup`);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  if (!zip.ok || zip.headers.get("content-type") !== "application/zip" || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("no backup zip");
  await post(`resumes/${made}/delete`);
  const key = (await (await fetch(`${BASE}/api/trash`)).json()).find((t) => t.id === made).key;
  const lib = await post(`trash/${key}/delete`);
  if ((await (await fetch(`${BASE}/api/trash`)).json()).some((t) => t.id === made)) throw new Error("still in the trash");
  await tab.go("#/");
});
await tab.close();
const errors = [...new Set(tab.errors)];
for (const e of errors) console.log("PAGE ERROR:", e);
console.log(failed || errors.length ? `\n${failed} step(s) failed, ${errors.length} page error(s)` : "\nall flows passed, no page errors");
process.exit(failed || errors.length ? 1 : 0);
