"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function VerifyBtn({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="d-next" disabled={!ready || pending}>{pending ? "Checking…" : "Verify"}</button>;
}

/** Six one-digit boxes that move along as you type, accept a pasted code, and a resend timer. */
export default function CodeForm({ verify, resend }: { verify: (fd: FormData) => void; resend: () => void }) {
  const [d, setD] = useState(["", "", "", "", "", ""]);
  const [wait, setWait] = useState(54);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const put = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    if (digits.length > 1) { const n = [...d]; digits.slice(0, 6 - i).split("").forEach((c, k) => { n[i + k] = c; }); setD(n); refs.current[Math.min(5, i + digits.length)]?.focus(); return; }
    const n = [...d]; n[i] = digits; setD(n);
    if (digits && i < 5) refs.current[i + 1]?.focus();
  };
  const code = d.join("");
  return (
    <>
      <form action={verify} className="d-code-form">
        <input type="hidden" name="code" value={code} />
        <div className="d-code" role="group" aria-label="6-digit code">
          {d.map((v, i) => (
            <label key={i}><span className="sr-only">Digit {i + 1}</span>
              <input ref={(el) => { refs.current[i] = el; }} value={v} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={6}
                onChange={(e) => put(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Backspace" && !d[i] && i > 0) refs.current[i - 1]?.focus(); }} />
            </label>
          ))}
        </div>
        <span className="d-t2">Enter 6-digit code</span>
        <VerifyBtn ready={code.length === 6} />
      </form>
      <form action={resend}>
        <button type="submit" className="d-resend" disabled={wait > 0}>{wait > 0 ? `Resend Code (${wait}s)` : "Resend Code"}</button>
      </form>
    </>
  );
}
