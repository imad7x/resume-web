/* Light or dark: the same choice as 7xjobs (localStorage "nobs:look"; shared on 7xjobs.com/resume/build).
 * Loaded first, before the page draws, so it never flashes the other look. Dark is the default. */
(function () {
  "use strict";
  const KEY = "nobs:look", h = document.documentElement;
  function apply() {
    let light = false;
    try { light = localStorage.getItem(KEY) === "light"; } catch (e) { /* storage blocked: dark */ }
    if (light) h.dataset.theme = "light"; else delete h.dataset.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#F3F6FB" : "#04060B"); // 7xjobs v21's page colours
    const scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute("content", light ? "light" : "dark");
  }
  apply();
  addEventListener("storage", (e) => { if (e.key === KEY) apply(); });      // changed in a 7xjobs tab
  window.RSTheme = {
    light: () => h.dataset.theme === "light",
    set(light) {
      try { if (light) localStorage.setItem(KEY, "light"); else localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      apply();
    },
  };
})();
