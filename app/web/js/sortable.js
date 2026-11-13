/* Drag to reorder (pointer based, with FLIP slides). */
(function () {
  "use strict";
  const RS = window.RS = window.RS || {};
  const {
    calm, EASE, el, flip,
  } = RS;

  // --------------------------------------------------------------- sortable
  /* Drag to reorder. The items are the children of `box` matching opts.item.
   * A drag starts from opts.handle, or (without one) anywhere on the item but
   * its inputs and buttons, once the pointer has moved a few px; a plain
   * click stays a click. Boxes with the same opts.group trade items.
   * opts.drop(item, fromBox, toBox) runs once the item is in its new place. */
  function sortable(box, opts) {
    box.dataset.sort = opts.group || "";
    box.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const item = e.target.closest(opts.item);
      if (!item || item.parentElement !== box) return;
      if (opts.handle ? !e.target.closest(opts.handle) : e.target.closest("input, textarea, button, select")) return;
      if (opts.handle) e.preventDefault();
      drag(e, item, box, opts);
    });
  }

  function drag(e0, item, from, opts) {
    const x0 = e0.clientX, y0 = e0.clientY, pid = e0.pointerId;
    let box = from, ph = null, started = false, raf = 0, last = e0, scroller = null;

    const itemsOf = (b) => [...b.children].filter((c) => c !== item && c !== ph && c.matches(opts.item) && !c.classList.contains("leaving"));
    function begin() {
      started = true;
      const r = item.getBoundingClientRect();
      ph = el("div.sort-ph");
      ph.style.height = r.height + "px";
      if (opts.wrap) ph.style.width = r.width + "px";
      item.before(ph);
      Object.assign(item.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
      item.classList.add("sort-drag");
      document.body.classList.add("sorting");
      scroller = from.closest(".form-pane, .drawer-body");
      tick();
    }
    function place(x, y) {
      let target = box;
      if (opts.group) {
        const under = document.elementFromPoint(x, y);
        const b = under && under.closest(`[data-sort="${opts.group}"]`);
        if (b) target = b;
      }
      const items = itemsOf(target);
      let idx = items.length;
      for (let i = 0; i < items.length; i++) {
        const c = items[i];
        const r = c.getBoundingClientRect();
        const t = c.getAnimations().find((a) => a.id === "flip") ? layoutRect(c) : r;
        if (opts.wrap ? (y < t.top || (y <= t.bottom && x < t.left + t.width / 2)) : y < t.top + t.height / 2) { idx = i; break; }
      }
      const now = ph.parentElement === target
        ? [...target.children].filter((c) => c === ph || (c !== item && c.matches(opts.item))).indexOf(ph) : -1;
      if (now === idx) return;
      const moving = [...new Set([...itemsOf(box), ...items])];
      flip(moving, () => {
        if (idx < items.length) items[idx].before(ph);
        else if (items.length) items[items.length - 1].after(ph);
        else target.prepend(ph);
      });
      box = target;
    }
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!scroller) return;
      const r = scroller.getBoundingClientRect(), y = last.clientY, edge = 70;
      let v = 0;
      if (y < r.top + edge) v = -Math.ceil((r.top + edge - y) / 5);
      else if (y > r.bottom - edge) v = Math.ceil((y - r.bottom + edge) / 5);
      if (v) { scroller.scrollTop += v; place(last.clientX, last.clientY); }
    }
    function move(e) {
      if (e.pointerId !== pid) return;
      last = e;
      if (!started) {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < 5) return;
        begin();
      }
      e.preventDefault();
      item.style.transform = `translate(${e.clientX - x0}px, ${e.clientY - y0}px)`;
      place(e.clientX, e.clientY);
    }
    function end(e) {
      if (e.pointerId !== pid) return;
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
      if (!started) return;
      cancelAnimationFrame(raf);
      // the click that follows a drag is not a click
      const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener("click", eat, true);
      setTimeout(() => removeEventListener("click", eat, true), 0);
      const was = item.getBoundingClientRect();
      item.classList.remove("sort-drag");
      for (const k of ["left", "top", "width", "height", "transform"]) item.style[k] = "";
      ph.replaceWith(item);
      document.body.classList.remove("sorting");
      if (!calm.matches) {
        const now = item.getBoundingClientRect();
        item.animate([{ transform: `translate(${was.left - now.left}px, ${was.top - now.top}px)` }, { transform: "none" }],
          { duration: 180, easing: EASE });
      }
      opts.drop(item, from, box);
    }
    addEventListener("pointermove", move, { passive: false });
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }

  /* Where `n` sits in the layout, ignoring a slide in progress. */
  function layoutRect(n) {
    const p = n.offsetParent;
    const pr = p ? p.getBoundingClientRect() : { left: 0, top: 0 };
    const left = pr.left + (p ? p.clientLeft - p.scrollLeft : 0) + n.offsetLeft;
    const top = pr.top + (p ? p.clientTop - p.scrollTop : 0) + n.offsetTop;
    return { left, top, width: n.offsetWidth, height: n.offsetHeight, right: left + n.offsetWidth, bottom: top + n.offsetHeight };
  }

  Object.assign(RS, {
    sortable, drag, layoutRect,
  });
})();
