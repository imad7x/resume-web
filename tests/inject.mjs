/* Hostile text in every field, through every design: no tag a visitor typed may become a real element
 * (the server prints public resumes in Chromium, so a slip would let a resume steer that browser).
 *
 *   tests/browser.sh start && node tests/inject.mjs [http://127.0.0.1:18089/resume/build] && tests/browser.sh stop
 */
import { Tab, BASE, sleep } from "./cdp.mjs";

const tab = await Tab.open();
const PAY = `"'><b class="pwn">x</b><meta http-equiv="refresh" content="0;url=http://10.255.255.1/"><img class="pwn" src=x onerror="document.title='pwn'">`;
await tab.send("Page.navigate", { url: BASE + "/print.html" });
await tab.wait("window.Resume && document.querySelector('#doc, .doc, body')", "print.html");
await tab.js(`new Promise((ok) => { const s = document.createElement("script"); s.src = "data/examples.js"; s.onload = ok; document.head.appendChild(s); })`);
const ids = (await (await fetch(BASE + "/api/templates")).json()).map((t) => t.id);
let failed = 0;
for (const id of ids) {
  const res = await tab.js(`(async () => {
    const PAY = ${JSON.stringify(PAY)};
    const poison = (v) => typeof v === "string" ? v + PAY : Array.isArray(v) ? v.map(poison)
      : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, poison(x)])) : v;
    const r = poison(JSON.parse(JSON.stringify(Examples.get(${JSON.stringify("federal")}))));
    r.basics.profiles = [{ network: "web" + PAY, username: "u" + PAY, url: "javascript:alert(1)" }];
    r.custom = [{ id: "own", title: "Own" + PAY, items: [{ title: "t" + PAY, sub: "s" + PAY, where: "w" + PAY, text: "x" + PAY, points: ["p" + PAY] }] }];
    delete document.body.dataset.ready;
    window.postMessage({ type: "render", resume: r, design: { template: ${JSON.stringify(id)}, paper: "a4" } }, location.origin);
    for (let i = 0; i < 100 && !document.body.dataset.ready; i++) await new Promise((ok) => setTimeout(ok, 50));
    const doc = document.querySelector(".doc");
    return { ready: !!document.body.dataset.ready, text: doc ? doc.textContent.includes('class="pwn"') : false,
      bad: doc ? doc.querySelectorAll(".pwn, meta, script, iframe, [onerror], a[href^=javascript]").length : -1,
      title: document.title, where: location.pathname };
  })()`);
  const ok = res.ready && res.bad === 0 && res.text && res.title !== "pwn" && res.where.endsWith("/print.html");
  if (!ok) failed++;
  console.log(`${ok ? "ok    " : "FAILED"} ${id}`, ok ? "" : JSON.stringify(res));
}
await sleep(300);
const where = await tab.js("location.href");
if (!where.endsWith("/print.html")) { failed++; console.log("FAILED: the page was sent to", where); }
await tab.close();
console.log(failed ? `${failed} designs FAILED` : `all ${ids.length} designs keep hostile text as text`);
process.exit(failed ? 1 : 0);
