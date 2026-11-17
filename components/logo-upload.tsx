"use client";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const MAX = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Company logo picker for the Founder details. Choosing or dropping a file saves it straight away. */
export default function LogoUpload({ action, ret, logoSrc, company }: { action: (fd: FormData) => void; ret: string; logoSrc: string; company: string }) {
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");

  function submit(f: File | undefined) {
    if (!f) return;
    if (!TYPES.includes(f.type)) { setErr("That file type isn't supported. Use a PNG, JPG or WebP."); if (input.current) input.current.value = ""; return; }
    if (f.size > MAX) { setErr("That file is over 2 MB. Choose a smaller logo."); if (input.current) input.current.value = ""; return; }
    setErr("");
    form.current?.requestSubmit();
  }

  const name = company.trim();
  const title = logoSrc ? `${name || "Company"} logo` : "Add company logo";
  const hint = logoSrc
    ? "Shown on your page and card."
    : "PNG, JPG or WebP, up to 2 MB.";

  return (
    <form
      ref={form}
      action={action}
      className={"logo-up" + (logoSrc ? "" : " empty") + (drag ? " drag" : "")}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const files = e.dataTransfer.files;
        if (!files.length || !input.current) return;
        input.current.files = files;
        submit(files[0]);
      }}
    >
      <input type="hidden" name="ret" value={ret} />
      <div className="logo-box" aria-hidden>
        {logoSrc ? <img src={logoSrc} alt="" /> : (
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" />
            <circle cx="9" cy="10" r="1.7" />
            <path d="m4.5 17 4.6-4.4 3.4 3.1 2.6-2.3 4.4 3.9" />
          </svg>
        )}
      </div>
      <div className="logo-txt">
        <b>{title}</b>
        <span className={err ? "logo-err" : undefined} role={err ? "alert" : undefined}>{err || hint}</span>
      </div>
      <PickButton hasLogo={!!logoSrc}>
        <input ref={input} name="logo" type="file" accept=".png,.jpg,.jpeg,.webp" hidden onChange={(e) => submit(e.target.files?.[0])} />
      </PickButton>
    </form>
  );
}

/** The upload button. Reads the form's pending state so it shows "Uploading" only while the save is in flight. */
function PickButton({ hasLogo, children }: { hasLogo: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <label className={"logo-btn" + (hasLogo ? " ghost" : "") + (pending ? " busy" : "")}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 15V4.5M7.5 9 12 4.5l4.5 4.5M5 14v3.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V14" />
      </svg>
      {pending ? "Uploading" : hasLogo ? "Change" : "Upload logo"}
      {children}
    </label>
  );
}
