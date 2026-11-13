/* Prints templates with example people, to look at them:
 *
 *   tests/browser.sh start
 *   node tests/tpl.mjs portrait:marketing director:creative …   (or no arguments: every template with its own example)
 *   tests/browser.sh stop
 *
 * Writes tests/out/tpl/<template>-<example>.pdf and one PNG per page (needs
 * docker for pdftoppm). Add an id of a saved resume as "portrait:@<id>".
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE || "http://127.0.0.1:18088";
const DEBUG = process.env.CDP || "http://127.0.0.1:9333";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "out", "tpl");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const info = await (await fetch(DEBUG + "/json/version")).json();
const ws = new WebSocket(info.webSocketDebuggerUrl);
await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = () => bad(new Error("no browser at " + DEBUG)); });
let seq = 0, session; const waiting = new Map(), errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.bad(new Error(m.error.message)) : w.ok(m.result); }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
};
const send = (method, params) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params: params || {}, sessionId: session })); return new Promise((ok, bad) => waiting.set(id, { ok, bad })); };
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
session = (await send("Target.attachToTarget", { targetId, flatten: true })).sessionId;
await send("Page.enable"); await send("Runtime.enable");
const js = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

let jobs = process.argv.slice(2);
if (!jobs.length) {
  await send("Page.navigate", { url: BASE + "/" }); await sleep(1500);
  jobs = await js("Object.values(Resume.templates).map((t) => t.id + ':' + (t.example || 'engineer'))");
}
fs.mkdirSync(OUT, { recursive: true });
for (const job of jobs) {
  const [tpl, who, paper] = job.split(":");
  const src = who.startsWith("@") ? "id=" + who.slice(1) : "example=" + who;
  await send("Page.navigate", { url: "about:blank" }); await sleep(50);
  await send("Page.navigate", { url: `${BASE}/print.html?${src}&t=${tpl}&paper=${paper || "a4"}&pdf=1` });
  for (let i = 0; i < 80 && !(await js("document.body && document.body.dataset.ready === '1'").catch(() => false)); i++) await sleep(100);
  await sleep(300);
  const { data } = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
  const name = `${tpl}-${who.replace("@", "")}`;
  fs.writeFileSync(path.join(OUT, name + ".pdf"), Buffer.from(data, "base64"));
  console.log("printed", name);
}
await send("Target.closeTarget", { targetId }); ws.close();
for (const e of new Set(errors)) console.log("PAGE ERROR:", e);
execFileSync("docker", ["run", "--rm", "--cpus", "1", "--memory", "512m", "--user", `${process.getuid()}:${process.getgid()}`, "-v", OUT + ":/w",
  "--entrypoint", "sh", "finance-ingest:latest", "-c", "cd /w && rm -f *.png && for f in *.pdf; do pdftoppm -r ${DPI:-60} -png \"$f\" \"${f%.pdf}\" 2>/dev/null; done; ls *.png | wc -l"], { stdio: "inherit" });
process.exit(errors.length ? 1 : 0);
