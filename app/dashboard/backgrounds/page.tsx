import Link from "next/link";
import { requireOwner } from "@/lib/auth";

/** Virtual background studio: a 1920x1080 video-call background with your name and scannable QR. */
export default async function Backgrounds() {
  const { profile } = await requireOwner();
  const src = `/card/${profile.handle}/background`;

  return (
    <>
      <div className="dash-top">
        <div>
          <h2>Virtual background</h2>
          <div className="dash-sub">Be scannable on every video call — your name and QR at the edges, the middle left clear for you.</div>
        </div>
      </div>

      <div className="panels">
        <div className="panel bgp">
          <h3>Preview</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bg-prev" src={src} alt="Your video-call background: name on the left, QR code on the right" />
          <div className="dc-actions" style={{ marginTop: 12 }}>
            <a className="btn" href={src} download={`${profile.handle}-background.png`}>Download PNG · 1920×1080</a>
            <a className="ghost" href={src} target="_blank" rel="noopener noreferrer">Open full size</a>
          </div>
        </div>
        <div className="panel">
          <h3>How to set it</h3>
          <ol className="howto">
            <li><b>Zoom</b>: Settings → Background &amp; effects → Virtual backgrounds → + Add image.</li>
            <li><b>Google Meet</b>: Apply visual effects → Upload a background image.</li>
            <li><b>Teams</b>: Video effects → Add new → upload the PNG.</li>
          </ol>
          <p className="muted2">The QR opens your card hub, so anyone on the call can scan you straight from the screen. It uses your brand colours — change them in <Link href="/app/settings">Settings</Link> and download again.</p>
          <p className="muted2">Presenting at an event instead? <Link href="/app/booth">Booth mode</Link> shows a full-screen QR people can scan from a distance.</p>
        </div>
      </div>
    </>
  );
}
