"use client";
import { useEffect, useRef } from "react";

/** Fades its children up the first time they scroll into view. */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: React.ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Comp = Tag as "div";
  return <Comp ref={ref as React.Ref<HTMLDivElement>} className={"s-reveal " + className} style={{ transitionDelay: `${delay}ms` }}>{children}</Comp>;
}

/** Tilts toward a mouse or pen and moves a highlight with it. Touch scrolls as normal. */
export function Tilt({ children, className = "", max = 10 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * max * 0.7}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
      el.classList.add("live");
    });
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.classList.remove("live");
    ["--ry", "--rx", "--mx", "--my"].forEach((v) => el.style.removeProperty(v));
  };
  return <div ref={ref} className={"s-tilt " + className} onPointerMove={move} onPointerLeave={leave}>{children}</div>;
}

/** Sticky header that gains a hairline and blur once the page scrolls. */
export function NavShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = () => ref.current?.classList.toggle("scrolled", window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return <header ref={ref} className="s-nav">{children}</header>;
}
