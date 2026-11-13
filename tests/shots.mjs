/* Walks the app in a real Chromium and saves a screenshot of every screen.
 *
 *   tests/browser.sh start                         a capped Chromium with remote debugging on :9333
 *   node tests/shots.mjs [base-url] [out-dir]      default http://127.0.0.1:18088 and tests/out
 *   tests/browser.sh stop
 *
 * Exits 1 when a page threw a JavaScript error or logged one, or a step did
 * not find what it waited for. Never point it at the live app: it edits.
 * Needs Node 22 (built-in WebSocket and fetch), nothing else.
 */
import fs from "node:fs";
import { Tab, BASE, OUT, sleep } from "./cdp.mjs";

/* The tests' own copy "regression" (owned by the hidden person "tests", so the home screen never shows it),
 * else the first resume in the library, so the walk does not depend on an id and leaves the owner's copies alone. */
async function firstResume() {
  const lib = await (await fetch(BASE + "/api/library?all=1")).json();
  if (!lib.resumes.length) throw new Error("the test state holds no resume");
  return lib.resumes.find((r) => r.title === "regression") || lib.resumes[0];
}

const SECTIONS = ["basics", "work", "skills", "education", "certificates", "projects", "languages"];

/* The way to 7xjobs.com must be on screen (not hidden, not pushed off the edge) and open safely in a new tab. */
async function jobsLinkShown(tab, where) {
  const r = await tab.js(`(() => {
    const a = [...document.querySelectorAll(".jobs-link")].find((x) => x.getClientRects().length);
    if (!a) return "missing";
    const b = a.getBoundingClientRect();
    if (b.width < 20 || b.right > innerWidth + 0.5 || b.left < 0 || b.bottom > innerHeight) return "off screen";
    if (a.href !== "https://7xjobs.com/" || a.target !== "_blank" || a.rel !== "noopener") return "wrong link";
    return "ok";
  })()`);
  if (r !== "ok") throw new Error("the 7xjobs link on " + where + ": " + r);
}

/* Words people didn't understand ("Points", "copy", "Re-evaluate") must not be on screen, and on the home
 * screen not the tests' own copy either. Only the app's own text counts: resume pages are in shadow roots. */
async function plainWords(tab, where, alsoBad) {
  const hit = await tab.js(`(() => {
    const bad = new RegExp("\\\\b(points?|cop(y|ies)|re-evaluate${alsoBad ? "|" + alsoBad : ""})\\\\b", "i");
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const p = n.parentElement;
      if (!p || p.closest("script, style, [hidden]") || !p.getClientRects().length) continue;
      if (bad.test(n.nodeValue)) return n.nodeValue.trim().slice(0, 80);
    }
    return "";
  })()`);
  if (hit) throw new Error(`unclear words on ${where}: "${hit}"`);
}

/* On a phone the tab bar must not cover the end of the form. */
async function tabbarClear(tab, where) {
  const r = await tab.js(`(() => {
    const bar = document.querySelector(".tabbar");
    if (!bar || !bar.getClientRects().length) return "no tab bar";
    const pane = document.querySelector(".form-pane");
    pane.scrollTop = pane.scrollHeight;
    const last = [...document.querySelectorAll(".panel-nav, .add-end")].filter((x) => x.getClientRects().length).pop();
    if (!last) return "nothing to measure";
    return last.getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 0.5 ? "ok" : "covered";
  })()`);
  if (r !== "ok") throw new Error("the tab bar on " + where + ": " + r);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const resume = await firstResume();
  const tab = await Tab.open();
  const steps = [];
  const step = (name, fn) => steps.push([name, fn]);

  step("library", async () => {
    await tab.go("#/");
    await tab.wait("document.querySelector('.card .host.drawn')", "a drawn library thumbnail");
    await jobsLinkShown(tab, "the library");
    await plainWords(tab, "the home screen", "regression");
    await tab.shot("library");
  });
  for (const key of SECTIONS) {
    step("editor " + key, async () => {
      await tab.go("#/r/" + resume.id, `localStorage.setItem("section", ${JSON.stringify(key)})`);
      await tab.wait("document.querySelector('.panel') && document.querySelector('.preview-pane .host').shadowRoot.querySelector('.doc').children.length",
        "the editor and its preview");
      await tab.shot("editor-" + key);
    });
  }
  step("home designs", async () => {
    await tab.go("#/");
    await tab.wait("document.getElementById('designs')", "the designs section");
    await tab.js("document.getElementById('designs').scrollIntoView()");
    await tab.wait("document.querySelectorAll('#designs .tpl .host.drawn').length > 3", "the design gallery");
    await tab.shot("home-designs");
    await tab.click("#designs .tpl[data-id=portrait]");
    await tab.wait("document.querySelector('#dlg[open] .dd-sheet .host.drawn')", "the design dialog");
    await tab.shot("design-dialog");
    await tab.js("document.getElementById('dlg').close()");
  });
  step("design drawer", async () => {
    await tab.go("#/r/" + resume.id, `localStorage.setItem("section", "work"); localStorage.setItem("designTab", "designs")`);
    await tab.wait("document.querySelector('.panel')", "the editor");
    await tab.click(".topbar .btn", "Design");
    await tab.wait("document.querySelectorAll('.drawer .tpl .host.drawn').length > 3", "the template gallery");
    await jobsLinkShown(tab, "the design drawer");
    await tab.shot("design");
    await tab.click(".drawer-tabs button", "Style");
    await tab.wait("document.querySelector('.style-tab .swatches')", "the style controls");
    await tab.shot("design-style");
    await tab.click(".drawer .icon-btn", "Close");
  });
  step("resume check", async () => {
    await tab.click(".score-pill");
    await tab.wait("document.querySelector('.drawer .dial')", "the check drawer");
    await sleep(1200);
    await tab.shot("score");
    await tab.click(".drawer .icon-btn", "Close");
  });
  step("history", async () => {
    await tab.click(".topbar .btn", "History");
    await tab.wait("document.querySelector('#dlg[open]')", "the history dialog");
    await tab.shot("history");
    await tab.js("document.getElementById('dlg').close()");
  });
  step("phone width", async () => {
    await tab.size(390, 844);
    await tab.go("#/r/" + resume.id, `localStorage.setItem("section", "work")`);
    await tab.wait("document.querySelector('.panel')", "the editor on a phone");
    await jobsLinkShown(tab, "the phone editor");
    await plainWords(tab, "the phone editor");
    await tab.shot("phone-editor");
    await tabbarClear(tab, "the phone editor");
    await tab.js("document.querySelector('.form-pane').scrollTop = 0; document.querySelector('.entry .entry-main').click()");
    await tab.wait("document.body.classList.contains('sheet-open')", "the role sheet");
    await plainWords(tab, "the role sheet");
    await tab.shot("phone-role-sheet");
    await tab.js("document.querySelector('.entry.open .sheet-foot .btn.primary').click()");
    await tab.wait("!document.body.classList.contains('sheet-open')", "the role sheet closing");
    await tab.js("document.querySelector('.tabbar [data-tab=preview]').click()");
    await tab.wait("document.querySelector('.preview-pane .host').shadowRoot.querySelector('.doc').children.length", "the preview on a phone");
    await tab.shot("phone-preview");
    await tab.js("document.querySelector('.tabbar [data-tab=check]').click()");
    await tab.wait("document.querySelector('.drawer .dial')", "the check on a phone");
    await sleep(1200);
    await plainWords(tab, "the phone check");
    await tab.shot("phone-check");
    await tab.js("document.querySelector('.tabbar [data-tab=edit]').click()");
    await tab.js("localStorage.setItem('designTab', 'designs'); RS.openDesign()");
    await tab.wait("document.querySelectorAll('.drawer .tpl .host.drawn').length > 1", "the design drawer on a phone");
    await jobsLinkShown(tab, "the phone design drawer");
    await tab.shot("phone-design");
    await tab.go("#/");
    await tab.wait("document.querySelector('.card .host.drawn') && document.querySelector('.continue .host.drawn')", "the library on a phone");
    await jobsLinkShown(tab, "the phone library");
    await plainWords(tab, "the phone home", "regression");
    await tab.shot("phone-library");
    await tab.size(1440, 900);
  });

  const only = process.env.ONLY;
  let failed = 0;
  for (const [name, fn] of steps) {
    if (only && !name.includes(only)) continue;
    console.log(name);
    try { await fn(); } catch (err) { failed++; console.log("  FAILED:", err.message); }
  }
  await tab.close();
  const errors = [...new Set(tab.errors)];
  for (const e of errors) console.log("PAGE ERROR:", e);
  console.log(failed || errors.length ? `\n${failed} step(s) failed, ${errors.length} page error(s)` : "\nall steps passed, no page errors");
  process.exit(failed || errors.length ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
