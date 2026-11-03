"use client";
import { useRef } from "react";

/** Company logo picker for the Founder details. Choosing a file saves it straight away. */
export default function LogoUpload({ action, ret, logoSrc, company }: { action: (fd: FormData) => void; ret: string; logoSrc: string; company: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className="logo-up">
      <input type="hidden" name="ret" value={ret} />
      <div className="logo-box" aria-hidden>{logoSrc ? <img src={logoSrc} alt="" /> : <span>{(company || "Logo").trim().slice(0, 1).toUpperCase()}</span>}</div>
      <div className="logo-txt">
        <b>{logoSrc ? "Company logo" : "Add your company logo"}</b>
        <span className="muted">{logoSrc ? "Shown on your card and page." : "PNG, JPG or WebP, up to 2 MB."}</span>
      </div>
      <label className="logo-btn">
        {logoSrc ? "Change" : "Upload"}
        <input name="logo" type="file" accept=".png,.jpg,.jpeg,.webp" hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) { alert("Please choose a logo under 2 MB."); e.target.value = ""; return; }
            form.current?.requestSubmit();
          }} />
      </label>
    </form>
  );
}
