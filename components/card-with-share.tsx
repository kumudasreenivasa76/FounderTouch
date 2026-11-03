"use client";
import { useState } from "react";
import DigitalCard from "./digital-card";
import ShareSheet from "./share-sheet";

type CardProps = React.ComponentProps<typeof DigitalCard>;
type ShareProps = Omit<React.ComponentProps<typeof ShareSheet>, "openSignal" | "hideButton">;

/** The digital card; tapping it opens the share sheet with the QR code. The Flip button still turns it over. */
export default function CardWithShare({ card, share }: { card: Omit<CardProps, "onTap">; share: ShareProps }) {
  const [signal, setSignal] = useState(0);
  return (
    <>
      <DigitalCard {...card} onTap={() => setSignal((n) => n + 1)} />
      <ShareSheet {...share} openSignal={signal} hideButton />
    </>
  );
}
