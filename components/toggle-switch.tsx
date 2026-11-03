/** An on/off switch that submits its form. Works without JavaScript and reads as a switch to screen readers. */
export default function ToggleSwitch({ action, on, label, hint }: { action: (fd: FormData) => void | Promise<void>; on: boolean; label: string; hint?: string }) {
  return (
    <form action={action} className="switch-row">
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <span style={{ flex: 1, minWidth: 0 }}><b id={`sw-${label.replace(/\W+/g, "-")}`}>{label}</b>{hint && <span className="muted" style={{ display: "block" }}>{hint}</span>}</span>
      <button role="switch" aria-checked={on} aria-labelledby={`sw-${label.replace(/\W+/g, "-")}`} className="switch" type="submit"><span className="knob" /></button>
    </form>
  );
}
