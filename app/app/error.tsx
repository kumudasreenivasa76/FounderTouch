"use client";

/** Something went wrong on a page: say so plainly and offer a way forward. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card" role="alert">
      <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
      <p className="muted">Your information is safe. Try again, and if it keeps happening go back Home.</p>
      <div className="row">
        <button type="button" onClick={reset}>Try again</button>
        <a className="btn ghost" href="/app">Go Home</a>
      </div>
    </div>
  );
}
