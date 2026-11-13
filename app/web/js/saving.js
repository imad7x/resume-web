/* Autosave, save conflicts and the status text in the top bar. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    S, $dlg, api, ago, toast, closeMenus, dialog, normalise,
  } = RS;

  // ------------------------------------------------------------------ saving
  function changed(opts) {
    S.seq++;
    setStatus("Edited", "");
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(save, 800);
    if (!(opts && opts.noPreview)) RS.drawPreview();
    RS.updateRail();
    RS.undoNote();
  }

  async function save(checkpoint) {
    clearTimeout(S.saveTimer);
    if (!S.doc) return;
    if (S.saving) { await S.saving.catch(() => {}); if (S.seq === S.savedSeq && !checkpoint) return; }
    const doc = S.doc, seq = S.seq;
    if (seq === S.savedSeq && !checkpoint) return;
    const slow = setTimeout(() => setStatus("Saving…", "busy"), 300);
    S.saving = api("resumes/" + doc.id, { rev: doc.rev, title: doc.title, design: doc.design, resume: doc.resume,
      target: doc.target || null, checkpoint: !!checkpoint });
    try {
      const res = await S.saving;
      if (S.doc !== doc) return;
      doc.rev = res.rev;
      doc.updated = res.updated;
      S.savedSeq = seq;
      if (S.seq === seq) setStatus("Saved", "ok");
      else S.saveTimer = setTimeout(save, 400);
    } catch (err) {
      if (err.status === 409) return conflict(err.data.doc);
      setStatus("Not saved – retrying", "bad");
      S.saveTimer = setTimeout(save, 5000);
    } finally {
      clearTimeout(slow);
      S.saving = null;
    }
  }
  const flush = () => (S.doc && (S.seq !== S.savedSeq || S.saving) ? save() : Promise.resolve());

  async function conflict(theirs) {
    setStatus("Changed elsewhere", "bad");
    const keepMine = await dialog({
      title: "This resume was changed somewhere else",
      text: `Another tab or device saved it ${ago(theirs.updated)}. Keep your version here, or load theirs (yours stays in History either way).`,
      okLabel: "Keep mine", cancelLabel: "Load theirs",
    });
    if (keepMine) {
      S.doc.rev = theirs.rev;
      save(true);
    } else {
      S.doc = theirs;
      normalise(S.doc.resume);
      S.seq = S.savedSeq = 0;
      RS.renderEditor();
      RS.undoStart();
    }
  }

  function setStatus(text, cls) {
    const s = document.getElementById("status");
    if (!s || (s.textContent === text && s.className === "status " + cls)) return;
    s.textContent = text;
    s.className = "status " + cls;
  }

  addEventListener("beforeunload", (e) => {
    if (S.doc && S.seq !== S.savedSeq && RS.PUBLIC) {
      RS.device("resumes/" + S.doc.id, { rev: S.doc.rev, title: S.doc.title, design: S.doc.design, resume: S.doc.resume, target: S.doc.target || null }).catch(() => {});
      e.preventDefault();
    } else if (S.doc && S.seq !== S.savedSeq) {
      fetch("api/resumes/" + S.doc.id, { method: "POST", keepalive: true,
        headers: { "X-Resume": "1", "Content-Type": "application/json" },
        body: JSON.stringify({ rev: S.doc.rev, title: S.doc.title, design: S.doc.design, resume: S.doc.resume, target: S.doc.target || null }) });
      e.preventDefault();
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (S.doc) save(true).then(() => toast("Saved, and kept as a version in History"));
    } else if (e.key === "Escape" && !$dlg.open) {
      closeMenus();
      RS.closeDesign();
    }
  });

  Object.assign(RS, {
    changed, save, flush, conflict, setStatus,
  });
})();
