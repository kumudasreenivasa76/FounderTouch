/** Shown instantly while a screen loads, so a tap always feels answered. */
export default function Loading() {
  return (
    <div className="sk-wrap" aria-busy="true" aria-label="Loading">
      <div className="sk line" style={{ width: 90, marginBottom: 18 }} />
      <div className="sk line" style={{ width: "55%", height: 26, borderRadius: 9, marginBottom: 12 }} />
      <div className="sk line" style={{ width: "80%" }} />
      <div className="sk" style={{ height: 120, margin: "22px 0 12px" }} />
      <div className="sk" style={{ height: 64, marginBottom: 8 }} />
      <div className="sk" style={{ height: 64, marginBottom: 8 }} />
      <div className="sk" style={{ height: 64 }} />
    </div>
  );
}
