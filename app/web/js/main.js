/* Routing between the library and the editor, and the start of the app. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    S, $app, prefs, el, api, closeMenus, swap, loadTemplates, flush, renderLibrary, openResume,
  } = RS;

  // ---------------------------------------------------------------- routing
  async function route() {
    closeMenus();
    await flush();
    const m = /^#\/r\/([a-z0-9]+)/.exec(location.hash);
    if (m) return openResume(m[1]);
    S.doc = null;
    S.viewing = null;
    S.pv = null;
    await refreshLibrary();
    swap(renderLibrary);
  }
  addEventListener("hashchange", route);

  async function refreshLibrary() {
    S.lib = await api("library");
    if (!S.lib.people.some((p) => p.id === S.person)) {
      const saved = prefs.get("person");
      S.person = (S.lib.people.find((p) => p.id === saved) || S.lib.people[0] || {}).id || null;
    }
  }

  // ------------------------------------------------------------------- start
  Promise.all([loadTemplates(), document.fonts.ready]).then(route).catch((err) => {
    $app.replaceChildren(el("div.lib", {}, el("div.empty", { text: "Couldn’t reach the server: " + err.message })));
  });

  Object.assign(RS, {
    route, refreshLibrary,
  });
})();
