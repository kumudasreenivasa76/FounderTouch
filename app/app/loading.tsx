/** Shown while a page loads, so the screen never goes blank. */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ height: 28, width: "55%", marginBottom: 14 }} />
      <div className="skel" style={{ height: 170, marginBottom: 14 }} />
      <div className="skel" style={{ height: 56, marginBottom: 10 }} />
      <div className="skel" style={{ height: 56, marginBottom: 10 }} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
