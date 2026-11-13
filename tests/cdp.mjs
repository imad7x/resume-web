/* A small Chrome DevTools Protocol client for the tests: one tab of the
 * Chromium that tests/browser.sh starts. Needs Node 22, nothing else. */
import fs from "node:fs";
import path from "node:path";

export const BASE = (process.argv[2] || "http://127.0.0.1:18088").replace(/\/$/, "");
export const OUT = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), "out");
const DEBUG = process.env.CDP || "http://127.0.0.1:9333";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Tab {
  static async open() {
    const info = await (await fetch(DEBUG + "/json/version")).json();
    const tab = new Tab();
    tab.ws = new WebSocket(info.webSocketDebuggerUrl);
    await new Promise((ok, bad) => { tab.ws.onopen = ok; tab.ws.onerror = () => bad(new Error("no browser at " + DEBUG)); });
    tab.seq = 0; tab.waiting = new Map(); tab.errors = [];
    tab.ws.onmessage = (ev) => tab.got(JSON.parse(ev.data));
    const { targetId } = await tab.send("Target.createTarget", { url: "about:blank" });
    tab.session = (await tab.send("Target.attachToTarget", { targetId, flatten: true })).sessionId;
    tab.targetId = targetId;
    for (const d of ["Page", "Runtime", "Log"]) await tab.send(d + ".enable");
    await tab.size(1440, 900);
    return tab;
  }

  got(msg) {
    if (msg.id && this.waiting.has(msg.id)) {
      const { ok, bad } = this.waiting.get(msg.id);
      this.waiting.delete(msg.id);
      return msg.error ? bad(new Error(msg.error.message)) : ok(msg.result);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      this.errors.push((d.exception && d.exception.description) || d.text);
    }
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      this.errors.push(msg.params.entry.text + " " + (msg.params.entry.url || ""));
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      this.errors.push(msg.params.args.map((a) => a.value || a.description).join(" "));
    }
  }

  send(method, params) {
    const id = ++this.seq;
    this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId: this.session }));
    return new Promise((ok, bad) => this.waiting.set(id, { ok, bad }));
  }

  size(width, height) {
    return this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  }

  /* The value of a JavaScript expression in the page (promises are awaited). */
  async js(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception.description || r.exceptionDetails.text);
    return r.result.value;
  }

  /* Open a path of the app. Goes through about:blank, since a change of the #hash alone does not reload. */
  async go(hash, before) {
    await this.send("Page.navigate", { url: "about:blank" });
    await sleep(100);
    await this.send("Page.navigate", { url: BASE + "/" });
    if (before) { await this.js(before); }
    await this.send("Page.navigate", { url: "about:blank" });
    await sleep(100);
    await this.send("Page.navigate", { url: BASE + "/" + (hash || "") });
  }

  async wait(expression, what, ms = 8000) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await this.js(`!!(${expression})`).catch(() => false)) return;
      await sleep(100);
    }
    throw new Error("waited in vain for " + (what || expression));
  }

  async click(selector, text) {
    const found = await this.js(`(() => {
      const all = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const want = ${JSON.stringify(text || "")};
      const n = all.find((x) => !want || x.textContent.trim() === want || (x.getAttribute("aria-label") || "") === want);
      if (!n) return false;
      n.scrollIntoView({ block: "center" });
      n.click();
      return true;
    })()`);
    if (!found) throw new Error(`nothing to click: ${selector} ${text || ""}`);
    await sleep(350);
  }

  async shot(name) {
    await this.js("document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))");
    await sleep(250);
    const { data } = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(data, "base64"));
    console.log("  shot", name);
  }

  async close() {
    await this.send("Target.closeTarget", { targetId: this.targetId }).catch(() => {});
    this.ws.close();
  }
}

