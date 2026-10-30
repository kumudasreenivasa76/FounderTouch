"use client";
import { useState } from "react";

/** A round picture that flips in 3D between two faces (the photo and the avatar) when tapped. */
export default function FlipAvatar({ front, back, size, center }: { front: React.ReactNode; back: React.ReactNode; size: number; center?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <button type="button" className={"flipav" + (on ? " on" : "")} onClick={() => setOn((v) => !v)} aria-label={on ? "Showing your avatar. Tap for your photo." : "Showing your photo. Tap for your avatar."} title="Tap to flip"
      style={{ width: size, height: size, margin: center ? "0 auto 10px" : 0 }}>
      <span className="flipav-in">
        <span className="flipav-face">{front}</span>
        <span className="flipav-face back">{back}</span>
      </span>
    </button>
  );
}
