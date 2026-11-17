"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppContext";

export function CursorDot() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const { cursorMode } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    let targetX = -100;
    let targetY = -100;
    let curX = -100;
    let curY = -100;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setVisible(true);
    };

    const onLeave = () => setVisible(false);

    const loop = () => {
      curX += (targetX - curX) * 0.22;
      curY += (targetY - curY) * 0.22;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      }
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={dotRef}
      className={`cursor-dot mode-${cursorMode}`}
      aria-hidden="true"
    />
  );
}
