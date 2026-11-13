/* The resume check in the editor: the score in the top bar and the drawer that lists what to improve. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const { S, el, btn, icon, tplDef, calm } = RS;

  function evaluate() {
    const d = S.doc.design, def = tplDef(d.template);
    return Smart.check(S.doc.resume, {
      pages: S.pv ? S.pv.marks.length + 1 : 0, ats: def.ats || "medium", academic: (def.tags || []).includes("academic"),
      renamed: (d.sections || []).filter((s) => s.title && !s.key.startsWith("custom:")).map((s) => s.title),
    });
  }
  const tone = (n) => (n >= 80 ? "good" : n >= 60 ? "fair" : "low");
  const verdict = (n) => (n >= 90 ? "Ready to send" : n >= 80 ? "Strong" : n >= 60 ? "Getting there" : "Needs work");

  let timer = 0, last = null;
  function refreshScore() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!S.ui || !S.doc) return;
      last = evaluate();
      const pill = S.ui.score;
      pill.className = "score-pill " + tone(last.score);
      pill.style.setProperty("--p", last.score);
      pill.querySelector(".score-text").textContent = last.score;
      if (S.drawer && (S.drawer.kind === "score" || S.drawer.kind === "match")) S.drawer.draw(false);
    }, 350);
  }

  function go(at) {
    if (!at) return;
    if (at.design) return RS.openDesign();
    if (!at.section) return;
    const list = S.doc.resume[at.section];
    RS.jumpTo({ section: at.section, item: Array.isArray(list) && at.i != null ? list[at.i] : undefined, field: at.field, index: at.index });
  }

  /* "Fix all" on a finding: the mechanical fixes (full stops, spaces, capitals, spelling). Ctrl+Z undoes it. */
  function fixAll(id) {
    const n = Smart.fix(S.doc.resume, id);
    RS.changed();
    RS.showSection(S.section, true);
    last = evaluate();
    if (S.drawer && S.drawer.draw) S.drawer.draw(false);
    RS.toast(n ? `Fixed ${n} place${n === 1 ? "" : "s"}` : "Nothing to change");
  }

  function openScore() {
    const body = el("div.drawer-body.score-body");
    function draw(animate) {
      const res = last || evaluate();
      const num = el("b", { text: animate ? "0" : res.score });
      const dial = el("div.dial." + tone(res.score), {}, num, el("span", { text: "of 100" }));
      dial.style.setProperty("--p", animate ? 0 : res.score);
      const parts = res.parts.map((p) => {
        const fill = el("i");
        fill.style.width = (animate ? 0 : (p.got / p.max) * 100) + "%";
        return { p, fill, node: el("div.part", {}, el("span", { text: p.name }), el("div.meter", {}, fill), el("output", { text: `${p.got}/${p.max}` })) };
      });
      const todo = res.findings.map((f) => el("li", {},
        el("div", {}, el("b", { text: f.text }), f.why ? el("small", { text: f.why }) : null),
        f.fix ? btn("Fix all", "small soft", () => fixAll(f.fix)) : null,
        f.at && (f.at.section || f.at.design) ? btn(f.at.design ? "Design" : "Show", "small", () => go(f.at)) : null));
      const jm = RS.matchLine && RS.matchLine();
      const job = el("div.match-line", {}, icon("target"),
        jm ? el("span", {}, "Matches ", el("b", { text: jm.score + "%" }), " of what the ", el("b", { text: jm.role }), " ad asks for")
          : el("span", { text: "Applying for a job? Paste the ad to see what this resume is missing for it." }),
        btn(jm ? "Open" : "Job match", "small soft", () => RS.openMatch()));
      body.replaceChildren(...[
        el("div.score-top", {}, dial, el("div", {}, el("h3", { text: verdict(res.score) }),
          el("p", { text: res.findings.length ? `${res.findings.length} thing${res.findings.length === 1 ? "" : "s"} would make it stronger.` : "Nothing left to flag." }),
          btn("Check again", "small soft", () => { last = evaluate(); draw(true); }, "spark"))),
        el("div.parts", {}, parts.map((x) => x.node)),
        job,
        todo.length ? el("section", {}, el("h3", { text: "To improve" }), el("ul.todo", {}, todo)) : null,
        res.good.length ? el("section", {}, el("h3", { text: "Already good" }),
          el("ul.good", {}, res.good.map((t) => el("li", {}, icon("check"), t)))) : null,
        el("p.hint", { text: "Checked as you type." })].filter(Boolean));
      if (!animate) return;
      // count up: the check itself is instant, the moment of looking it over should not be
      const t0 = performance.now(), span = calm.matches ? 1 : 900;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / span), e = 1 - Math.pow(1 - k, 3), v = Math.round(res.score * e);
        num.textContent = v;
        dial.style.setProperty("--p", v);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame((now) => { tick(now); for (const x of parts) x.fill.style.width = (x.p.got / x.p.max) * 100 + "%"; });
    }
    const node = RS.openDrawer("score", "Resume check", body, "page", () => {});
    if (!node) return;
    S.drawer.draw = draw;
    last = evaluate();
    draw(true);
  }

  Object.assign(RS, { refreshScore, openScore });
})();
