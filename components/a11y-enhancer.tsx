"use client";
import { useEffect } from "react";

let seq = 0;
const CONTROLS = "input:not([type=hidden]):not([type=submit]), select, textarea";

/** Gives a form control its name from the nearest visible text: a label above it, then its placeholder. */
function nameControls(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(CONTROLS).forEach((el) => {
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest("label")) return;
    // a "label.f" sitting just before the control (directly, or at the start of its column) is its visible label
    let prev: Element | null = el.previousElementSibling;
    if (!prev && el.parentElement && el.parentElement.children.length > 1) prev = el.parentElement.firstElementChild;
    if (prev instanceof HTMLLabelElement && !prev.htmlFor && !prev.querySelector(CONTROLS)) {
      if (!el.id) el.id = `f${++seq}`;
      prev.htmlFor = el.id;
      return;
    }
    const text = el.getAttribute("placeholder") || el.getAttribute("name")?.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
    if (text) el.setAttribute("aria-label", text.charAt(0).toUpperCase() + text.slice(1));
  });
}

/** Messages announce themselves, and decorative icons are hidden from screen readers. */
function fixRoles(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".err:not([role])").forEach((e) => e.setAttribute("role", "alert"));
  root.querySelectorAll<HTMLElement>(".ok:not([role])").forEach((e) => e.setAttribute("role", "status"));
  root.querySelectorAll<HTMLElement>(".menu-ico:not([aria-hidden]), .face-hint:not([aria-hidden])").forEach((e) => e.setAttribute("aria-hidden", "true"));
}

/**
 * Pages are built from many small forms. This keeps their controls named for assistive technology,
 * including content that appears later (panes, dialogs). Runs on a short debounce.
 */
export default function A11yEnhancer() {
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const run = () => { nameControls(document); fixRoles(document); };
    const queue = () => { clearTimeout(t); t = setTimeout(run, 60); };
    run();
    const mo = new MutationObserver(queue);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); clearTimeout(t); };
  }, []);
  return null;
}
