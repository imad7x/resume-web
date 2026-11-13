/* Undo and redo for the whole copy: the name, the design and the resume.
 * A snapshot is taken when the edits pause (half a second), so one undo takes
 * back a burst of typing, a drag, a deleted entry or a design change. Ctrl+Z,
 * Ctrl+Shift+Z or Ctrl+Y, the arrows in the top bar, or the More menu.
 * The stack lives in the page only; History keeps the saved versions. */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const { S, normalise } = RS;
  const MAX = 60;
  let timer = 0;

  const snap = () => JSON.stringify({ title: S.doc.title, design: S.doc.design, resume: S.doc.resume });

  /* A fresh stack for the copy that just opened (or was reloaded). */
  function start() {
    clearTimeout(timer);
    S.undo = { id: S.doc.id, past: [snap()], future: [] };
    buttons();
  }

  /* Called by RS.changed(): take a snapshot once the edits pause. */
  function note() {
    if (!S.undo || S.undo.id !== S.doc.id || S.undo.busy) return;
    clearTimeout(timer);
    timer = setTimeout(record, 500);
    buttons();
  }
  function record() {
    clearTimeout(timer);
    timer = 0;
    const u = S.undo;
    if (!u || !S.doc || u.id !== S.doc.id) return;
    const now = snap();
    if (now === u.past[u.past.length - 1]) return;
    u.past.push(now);
    if (u.past.length > MAX) u.past.shift();
    u.future = [];
    buttons();
  }

  function undo() {
    if (!S.undo || !S.doc) return;
    record();
    const u = S.undo;
    if (u.past.length < 2) return RS.toast("Nothing to undo");
    u.future.push(u.past.pop());
    restore(u.past[u.past.length - 1]);
  }
  function redo() {
    if (!S.undo || !S.doc) return;
    record();
    const u = S.undo;
    if (!u.future.length) return RS.toast("Nothing to redo");
    const s = u.future.pop();
    u.past.push(s);
    restore(s);
  }

  /* Put a snapshot back and redraw the open section, keeping the open entries, the scroll and the focus. */
  function restore(json) {
    const d = JSON.parse(json), old = S.doc.resume, pane = S.ui && S.ui.pane;
    const opened = [];
    for (const [k, list] of Object.entries(old)) if (Array.isArray(list)) list.forEach((it, i) => { if (S.open && S.open.has(it)) opened.push([k, i]); });
    const fields = pane ? [...pane.querySelectorAll("input, textarea, select")] : [];
    const at = fields.indexOf(document.activeElement);
    const caret = at >= 0 && "selectionStart" in document.activeElement ? document.activeElement.selectionStart : null;
    const top = pane ? pane.scrollTop : 0;

    S.undo.busy = true;
    S.doc.title = d.title;
    S.doc.design = d.design;
    S.doc.resume = d.resume;
    normalise(S.doc.resume);
    S.open = new Set(opened.map(([k, i]) => S.doc.resume[k] && S.doc.resume[k][i]).filter(Boolean));
    const title = document.querySelector(".title-input");
    if (title) title.value = S.doc.title;
    if (S.drawer) RS.renderEditor();
    else { RS.renderRail(); RS.showSection(S.section, true); }
    if (S.ui && S.ui.pane) {
      S.ui.pane.scrollTop = top;
      const again = [...S.ui.pane.querySelectorAll("input, textarea, select")][at];
      if (again) {
        again.focus({ preventScroll: true });
        if (caret != null && "setSelectionRange" in again) try { again.setSelectionRange(caret, caret); } catch { /* not a text field */ }
      }
    }
    RS.changed();
    S.undo.busy = false;
    buttons();
  }

  /* The two arrows in the editor's top bar follow the stack. */
  function buttons() {
    const u = S.undo;
    for (const b of document.querySelectorAll("[data-undo]")) {
      b.disabled = !u || (b.dataset.undo === "undo" ? u.past.length < 2 && !timer : !u.future.length);
    }
  }

  document.addEventListener("keydown", (e) => {
    if (!S.doc || !document.body.classList.contains("editing") || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (document.querySelector("dialog[open]")) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
  });

  Object.assign(RS, { undoStart: start, undoNote: note, undo, redo, undoButtons: buttons });
})();
