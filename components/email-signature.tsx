"use client";
import { useRef, useState } from "react";

/** Email signature preview. "Copy signature" copies rich text, so it pastes into Gmail or Outlook with formatting. */
export default function EmailSignature({ html }: { html: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState("");
  const copy = async () => {
    try {
      if (navigator.clipboard && "ClipboardItem" in window) {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([box.current?.innerText ?? ""], { type: "text/plain" }) })]);
      } else throw new Error("fallback");
      setDone("Copied ✓");
    } catch {
      const r = document.createRange(); r.selectNodeContents(box.current!);
      const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
      setDone(document.execCommand("copy") ? "Copied ✓" : "Select and copy it");
    }
    setTimeout(() => setDone(""), 2000);
  };
  return (
    <>
      <div ref={box} className="card" style={{ background: "#fff" }} dangerouslySetInnerHTML={{ __html: html }} />
      <div className="row"><button type="button" onClick={copy}>{done || "Copy signature"}</button></div>
    </>
  );
}
