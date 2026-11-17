"use client";

import { useEffect, useRef } from "react";

export function SwerveField() {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId = 0;
    const sync = () => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const p = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      el.style.setProperty("--bg-p", p.toFixed(4));
      document.documentElement.style.setProperty("--scroll-p", p.toFixed(4));
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={wrapRef} className="swerve-backdrop" aria-hidden="true">
      <div className="swerve-wash swerve-wash-primary" />
      <div className="swerve-wash swerve-wash-slate" />
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="swerve-lines-svg"
      >
        <path
          d="M-80 260 Q 320 120, 680 280 T 1520 220"
          className="swerve-curve swerve-curve-a"
        />
        <path
          d="M-80 480 Q 390 620, 820 430 T 1520 510"
          className="swerve-curve swerve-curve-b"
        />
        <path
          d="M-80 710 Q 280 560, 740 730 T 1520 660"
          className="swerve-curve swerve-curve-c"
        />
      </svg>
    </div>
  );
}
