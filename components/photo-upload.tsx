"use client";
import { useRef } from "react";

/**
 * Wraps an avatar so tapping it opens the file chooser. Picking a photo uploads it straight away.
 * `action` is the server action that saves the photo (form field name: "photo").
 */
export default function PhotoUpload({ action, size, center, children }: { action: (fd: FormData) => void | Promise<void>; size: number; center?: boolean; children: React.ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const badge = Math.max(18, Math.round(size * 0.3));
  return (
    <form ref={form} action={action} style={{ position: "relative", display: center ? "block" : "inline-block", width: size, height: size, margin: center ? "0 auto 10px" : 0, flexShrink: 0 }}>
      <input
        ref={input} type="file" name="photo" accept="image/png,image/jpeg,image/webp" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 5 * 1024 * 1024) { alert("Please choose a photo under 5 MB."); e.target.value = ""; return; }
          form.current?.requestSubmit();
        }}
      />
      <button type="button" aria-label="Upload a profile photo" title="Tap to upload a photo" onClick={() => input.current?.click()}
        style={{ width: size, height: size, padding: 0, background: "none", borderRadius: "50%", display: "block", position: "relative" }}>
        {children}
        <span aria-hidden style={{ position: "absolute", right: -3, bottom: -3, width: badge, height: badge, borderRadius: "50%", background: "#3b5bdb", color: "#fff", fontSize: badge * 0.55, lineHeight: `${badge}px`, border: "2px solid #fff", textAlign: "center" }}>📷</span>
      </button>
    </form>
  );
}
