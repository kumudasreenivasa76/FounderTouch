"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A link that shows its page in a panel over the current screen instead of leaving it.
 * Without JavaScript, or with Ctrl/Cmd/middle click, it behaves like a normal link.
 */
export default function PreviewLink({ href, title = "Preview", className, style, children }: { href: string; title?: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    setHost(document.querySelector(".phone") ?? document.body);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    closeBtn.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); opener.current?.focus(); };
  }, [open]);
  useEffect(() => { if (open && host) closeBtn.current?.focus(); }, [open, host]);

  return (
    <>
      <a ref={opener} href={href} className={className} style={style}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          setOpen(true);
        }}>{children}</a>
      {open && host && createPortal(
        <div className="pv" role="dialog" aria-modal="true" aria-label={title}>
          <div className="pv-bar">
            <b>{title}</b>
            <a href={href} target="_blank" rel="noopener noreferrer">Open in new tab</a>
            <button ref={closeBtn} type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          <iframe src={href} title={title} />
        </div>,
        host,
      )}
    </>
  );
}
