/* The public builder (resume-public, PUBLIC=1, under /resume/build/): resumes stay in the browser's
 * IndexedDB, only the PDF goes to the server, and the home server's endpoints are closed.
 *
 *   tests/browser.sh start && node tests/public.mjs [http://127.0.0.1:18089/resume/build] && tests/browser.sh stop
 */
import { Tab, BASE, sleep } from "./cdp.mjs";

const tab = await Tab.open();
let failed = 0;
const step = async (name, fn) => {
  console.log(name);
  try { await fn(); } catch (err) { failed++; console.log("  FAILED:", err.message); }
};
const expect = async (expression, what) => { if (!(await tab.js(`!!(${expression})`))) throw new Error("expected " + (what || expression)); };

await tab.go("#/");
await tab.js("new Promise((ok) => { const r = indexedDB.deleteDatabase('7xresume'); r.onsuccess = r.onerror = r.onblocked = ok; })");

await step("a fresh visitor: public mode, nothing stored, no family tabs, the privacy line", async () => {
  await tab.go("#/");
  await tab.wait("document.querySelector('#designs .tpl')", "the gallery");
  await expect("document.documentElement.dataset.public === '1' && RS.PUBLIC", "public mode");
  await expect("!document.querySelector('.tabs')", "no person tabs");
  await expect("document.querySelector('.privacy') && document.querySelector('.privacy').getBoundingClientRect().height > 0", "the privacy line");
  await expect("RS.S.lib.resumes.length === 0", "no resumes yet");
  await expect("document.querySelector('.jobs-link').getAttribute('href') === '/' && !document.querySelector('.jobs-link').target", "7xjobs link on the same site");
  for (const p of ["library", "trash", "backup", "people", "resumes/abcdef1234"]) {
    const st = (await fetch(`${BASE}/api/${p}`)).status;
    if (st !== 404) throw new Error(`api/${p} answered ${st}`);
  }
  await tab.shot("public-home");
});
let id = null;
await step("start from a design; it is kept in this browser and survives a reload", async () => {
  await tab.click("#designs .tpl[data-id=hybrid]");
  await tab.wait("document.querySelector('#dlg[open] .dd-sheet .host.drawn')", "the design dialog");
  await tab.click("#dlg input[value=example]");
  await tab.click("#dlg .dlg-foot .btn.primary");
  await tab.wait("window.RS && RS.S.doc && document.querySelector('.panel')", "the editor");
  id = await tab.js("RS.S.doc.id");
  await tab.js("RS.S.doc.resume.basics.label = 'Growth Marketing Lead'; RS.changed(); RS.flush()");
  await sleep(500);
  await tab.go("#/r/" + id);
  await tab.wait("window.RS && RS.S.doc && RS.S.doc.id === '" + id + "'", "the editor after a reload");
  await expect("RS.S.doc.resume.basics.label === 'Growth Marketing Lead'", "the change kept");
  await tab.shot("public-editor");
});
await step("the PDF is printed by the server from what the browser sends", async () => {
  const out = await tab.js(`fetch('api/pdf', { method: 'POST', headers: { 'X-Resume': '1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: RS.S.doc.title, design: RS.S.doc.design, resume: RS.S.doc.resume }) })
    .then(async (r) => ({ status: r.status, type: r.headers.get('content-type'), head: new TextDecoder().decode((await r.arrayBuffer()).slice(0, 5)) }))`);
  if (out.status !== 200 || out.type !== "application/pdf" || out.head !== "%PDF-") throw new Error("no PDF: " + JSON.stringify(out));
});
await step("history, delete, Deleted resumes, restore, backup file", async () => {
  await tab.js("RS.save(true)");
  await sleep(400);
  const versions = await tab.js(`RS.device('resumes/${id}/history').then((v) => v.length)`);
  if (versions < 1) throw new Error("no version kept");
  await tab.go("#/");
  await tab.wait("document.querySelector('.cards .card')", "the resume on the home screen");
  await tab.js(`RS.device('resumes/${id}/delete', {})`);
  await tab.go("#/");
  await tab.wait("document.querySelector('.privacy')", "home");
  await tab.click(".topbar .icon-btn");
  await tab.wait("document.querySelector('.menu')", "the menu");
  await tab.js("[...document.querySelectorAll('.menu button')].find((b) => /Deleted resumes/.test(b.textContent)).click()");
  await tab.wait("document.querySelector('#dlg[open] .trash-list li')", "the deleted list");
  await tab.js("document.querySelector('#dlg .trash-do .btn').click()");
  await tab.wait(`RS.S.lib.resumes.some((r) => r.id === '${id}')`, "restored");
  const n = await tab.js("RS.deviceBackup().then((b) => b.resumes.length)");
  if (n !== 1) throw new Error("backup holds " + n);
});
await step("one tap deletes from the home screen, Undo brings it back; no step boxes", async () => {
  await tab.go("#/");
  await tab.wait("document.querySelector('.continue .cont-del')", "the delete button on the Last edited card");
  await tab.click(".continue .cont-del");
  await tab.wait(`!RS.S.lib.resumes.some((r) => r.id === '${id}') && document.querySelector('#toast button')`, "deleted, with Undo");
  await tab.shot("public-deleted");
  await expect("!document.querySelector('.steps')", "no step boxes on the empty home");
  await tab.click("#toast button");
  await tab.wait(`RS.S.lib.resumes.some((r) => r.id === '${id}')`, "back after Undo");
  await tab.wait("document.querySelector('.cards .card .icon-btn[title=\"Delete this resume\"]')", "a delete button on the list card too");
});
await tab.js("new Promise((ok) => { const r = indexedDB.deleteDatabase('7xresume'); r.onsuccess = r.onerror = r.onblocked = ok; })");
await tab.close();
const errors = [...new Set(tab.errors)];
for (const e of errors) console.log("PAGE ERROR:", e);
console.log(failed || errors.length ? `\n${failed} step(s) failed, ${errors.length} page error(s)` : "\nall public steps passed, no page errors");
process.exit(failed || errors.length ? 1 : 0);
