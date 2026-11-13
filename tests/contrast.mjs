/* Text contrast on the main screens, dark and light (the light look follows 7xjobs' nobs:look).
 * Each visible text's colour against the first solid background behind it: 4.5:1, or 3:1 for large text.
 * Text over a gradient, image or the resume pages (they are print designs) is skipped.
 *
 *   tests/browser.sh start && node tests/contrast.mjs [BASE] && tests/browser.sh stop */
import { Tab, BASE, sleep } from "./cdp.mjs";

const MEASURE = `(() => {
  const parse = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const mix = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const bad = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode, el = t.parentElement;
    if (!t.textContent.trim() || !el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest('.doc, .host, .mini, .desk-sheet, svg, [aria-hidden="true"], .sr-only')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || +cs.opacity === 0) continue;
    let fg = parse(cs.color), layers = [], n = el, skip = false, op = 1;
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n);
      op *= +s.opacity;
      if (s.backgroundImage !== "none" && !/^url\\(/.test(s.backgroundImage)) { skip = true; break; }
      const bg = parse(s.backgroundColor);
      if (bg && bg.a > 0) { layers.push(bg); if (bg.a >= .99) break; }
      n = n.parentElement;
    }
    if (skip || !fg || op < .5) continue;
    let base = { r: 0, g: 0, b: 0, a: 1 };
    if (!layers.length || layers[layers.length - 1].a < .99) base = document.documentElement.dataset.theme === "light" ? { r: 244, g: 246, b: 250, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
    let bg = base;
    for (const l of layers.reverse()) bg = mix(l, bg);
    fg = mix(fg, bg);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 600;
    const need = size >= 24 || (size >= 18.6 && bold) ? 3 : 4.5;
    if (el.disabled || el.closest("[disabled], .disabled, button:disabled")) continue;
    if (ratio < need) bad.push(ratio.toFixed(2) + " < " + need + "  " + (el.className || el.tagName) + ": " + t.textContent.trim().slice(0, 40));
  }
  return bad;
})()`;

const tab = await Tab.open();
let failed = 0;
const lib = await (await fetch(BASE + "/api/library?all=1")).json();
const reg = lib.resumes.find((r) => r.title === "regression");
for (const theme of ["dark", "light"]) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await tab.size(w, h);
    await tab.go("#/");
    await tab.js(theme === "light" ? "localStorage.setItem('nobs:look', 'light')" : "localStorage.removeItem('nobs:look')");
    const screens = [
      ["home", "#/", "document.querySelector('#designs .tpl')", null],
      ["editor", "#/r/" + reg.id, "window.RS && RS.S.doc && document.querySelector('.panel')", null],
      ["check", "#/r/" + reg.id, "window.RS && RS.S.doc && document.querySelector('.panel')", "RS.openScore()"],
      ["design", "#/r/" + reg.id, "window.RS && RS.S.doc && document.querySelector('.panel')", "RS.openDesign()"],
    ];
    for (const [name, hash, ready, then] of screens) {
      await tab.go(hash);
      await tab.wait(ready, name);
      if (then) await tab.js(then);
      await sleep(900);
      const bad = await tab.js(MEASURE);
      const label = `${theme} ${w}px ${name}`;
      if (bad.length) { failed++; console.log(`${label}: ${bad.length} low-contrast text(s)`); for (const b of bad.slice(0, 8)) console.log("   " + b); }
      else console.log(`${label}: ok`);
    }
  }
}
await tab.js("localStorage.removeItem('nobs:look')");
await tab.close();
console.log(failed ? `\n${failed} screen(s) with low contrast` : "\nall screens pass the contrast check");
process.exit(failed ? 1 : 0);
