/* One resume on its own page.
 *
 *   print.html?id=<id>[&t=<template>][&paper=a4|letter]&pdf=1   laid out for paper (Chromium prints this)
 *   print.html?id=<id>&embed=1                                    drawn at design width (library thumbnails)
 *   print.html?embed=1                                            waits for the editor to post
 *                                                                 {type: "render", resume, design}
 *
 * In a frame it posts {type: "size", height, layout} to the parent after each draw.
 */
(function () {
  "use strict";
  const q = new URLSearchParams(location.search);
  const el = document.getElementById("doc");
  if (q.get("embed")) document.documentElement.style.overflow = "hidden";   // a thumbnail shows the top only
  const loading = {};

  function loadTemplate(id) {
    if (Resume.templates[id]) return Promise.resolve();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return Promise.reject(new Error("bad template"));
    loading[id] = loading[id] || new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "templates/" + id + ".js";
      s.onload = resolve;
      s.onerror = () => { delete loading[id]; reject(new Error("no template " + id)); };
      document.head.appendChild(s);
    });
    return loading[id];
  }

  function report(L) {
    if (window.parent === window) return;
    const send = () => window.parent.postMessage({
      type: "size", height: el.offsetHeight, width: el.offsetWidth,
      layout: { first: L.first, next: L.next },
    }, location.origin);
    send();
    document.fonts.ready.then(send);
  }

  let seq = 0;
  async function draw(resume, design, mode) {
    const mine = ++seq;
    await loadTemplate(design.template);
    if (mine !== seq) return;                    // a newer draw started while the template loaded
    const L = Resume.render(el, resume, design, mode);
    const name = ((resume || {}).basics || {}).name;
    document.title = name ? name + " - Resume" : "Resume";
    report(L);
    await document.fonts.ready;
    document.body.dataset.ready = "1";
  }

  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== "render") return;
    draw(e.data.resume, e.data.design, "screen").catch((err) => {
      el.textContent = String(err.message || err);
    });
  });

  if (q.get("example")) {              // a made-up person, to look at a template: ?example=marketing&t=portrait
    const s = document.createElement("script");
    s.src = "data/examples.js";
    s.onload = () => draw(window.Examples.get(q.get("example")), { template: q.get("t") || "charcoal", paper: q.get("paper") || "a4" },
      q.get("pdf") ? "print" : "screen").catch((err) => { el.textContent = String(err.message || err); });
    document.head.appendChild(s);
  } else if (q.get("id")) {
    fetch("api/resumes/" + encodeURIComponent(q.get("id")))
      .then((r) => r.json())
      .then((doc) => {
        const design = Object.assign({}, doc.design);
        if (q.get("t")) design.template = q.get("t");
        if (q.get("paper")) design.paper = q.get("paper");
        return draw(doc.resume, design, q.get("pdf") ? "print" : "screen");
      })
      .catch((err) => { el.textContent = String(err.message || err); });
  }
})();
