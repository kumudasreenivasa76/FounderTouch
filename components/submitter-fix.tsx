"use client";
import { useEffect } from "react";

/**
 * Several forms use one form with several named buttons (Accept / Decline / Block, deal stages, colour swatches).
 * React's server-action submit drops the clicked button's name and value, so the action could not tell which
 * button was pressed. Before React reads the form, copy the clicked button into a hidden field, then remove it.
 */
export default function SubmitterFix() {
  useEffect(() => {
    const onSubmit = (e: SubmitEvent) => {
      const btn = e.submitter as HTMLButtonElement | HTMLInputElement | null;
      const form = e.target as HTMLFormElement | null;
      if (!btn || !form || !btn.name || btn.hasAttribute("formaction")) return;
      if (form.querySelector(`input[type=hidden][data-submitter][name="${CSS.escape(btn.name)}"]`)) return;
      const hidden = document.createElement("input");
      hidden.type = "hidden"; hidden.name = btn.name; hidden.value = btn.value; hidden.dataset.submitter = "";
      form.appendChild(hidden);
      setTimeout(() => hidden.remove(), 0);
    };
    window.addEventListener("submit", onSubmit, true);
    return () => window.removeEventListener("submit", onSubmit, true);
  }, []);
  return null;
}
