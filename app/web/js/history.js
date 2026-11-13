/* Earlier versions of a resume: view and restore. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    S, $dlg, el, btn, api, ago, plural, toast, dialog, tplDef, normalise, changed, save, flush,
    renderEditor, setView, drawPreview,
  } = RS;

  // ---------------------------------------------------------------- history
  async function openHistory() {
    await flush();
    const versions = await api(`resumes/${S.doc.id}/history`);
    const list = el("div.versions", {}, versions.length ? versions.map((v) => el("div.version", {},
      el("div", {}, el("b", { text: ago(v.saved) }),
        el("small", { text: `${new Date(v.saved).toLocaleString()} · ${tplDef(v.template).name} · ${plural(v.jobs, "job")} · ${plural(v.points, "line")}` })),
      btn("Preview", "small ghost", async () => { $dlg.close(); showVersion(await api(`resumes/${S.doc.id}/history/${v.version}`)); }, "eye"),
      btn("Restore", "small", async () => { $dlg.close(); restore(await api(`resumes/${S.doc.id}/history/${v.version}`)); })))
      : el("p.hint", { text: "No earlier versions yet. One is kept for every editing session (and whenever you press Ctrl+S)." }));
    dialog({ title: "History", text: "Earlier versions of this resume. Restoring keeps the current one here too.",
      body: list, cancelLabel: "Close", okLabel: "Save a version now", okClass: "",
      ok: async () => { await save(true); toast("Version saved"); return true; } });
  }

  function showVersion(v) {
    S.viewing = v;
    S.pv.banner.hidden = false;
    S.pv.banner.replaceChildren(el("span", { text: `Showing the version from ${new Date(v.updated).toLocaleString()}.` }),
      btn("Restore it", "small primary", () => restore(v)),
      btn("Back to current", "small ghost", () => { S.viewing = null; S.pv.banner.hidden = true; drawPreview(); }));
    drawPreview();
    if (innerWidth <= 900) setView(true);
  }

  async function restore(v) {
    S.viewing = null;
    S.doc.resume = normalise(v.resume);
    S.doc.design = v.design;
    S.doc.title = v.title;
    S.open = new Set(S.doc.resume.work.slice(0, 1));
    renderEditor();
    changed();
    await save(true);
    toast("Restored. The version before it is in History.");
  }

  Object.assign(RS, {
    openHistory, showVersion, restore,
  });
})();
