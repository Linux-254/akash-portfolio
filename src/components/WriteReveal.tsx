"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface WriteRevealProps {
  text: string;
  className?: string;
  as?: "p" | "span" | "blockquote" | "div" | "strong";
  style?: React.CSSProperties;
}

export function WriteReveal({
  text,
  className = "",
  as: Tag = "p",
  style,
}: WriteRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [done, setDone] = useState(false);

  const tokens = useMemo(() => {
    const out: { char: string; wordEnd: number }[] = [];
    let idx = 0;
    const words = text.split(/(\s+)/);
    for (const part of words) {
      const start = idx;
      const end = start + part.length;
      for (let i = 0; i < part.length; i++) {
        out.push({ char: part[i], wordEnd: end });
      }
      idx = end;
    }
    return out;
  }, [text]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealedCount(tokens.length);
      setDone(true);
      return;
    }

    let lastY = window.scrollY;
    let lastT = performance.now();
    let rafId = 0;
    let shown = 0;

    const tick = () => {
      const el = ref.current;
      if (!el) return;
      const now = performance.now();
      const dt = Math.max((now - lastT) / 1000, 0.016);
      const y = window.scrollY;
      const vel = Math.abs(y - lastY) / dt;
      lastY = y;
      lastT = now;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const startY = vh * 0.96;
      const endY = vh * 0.42;
      const progress = Math.min(Math.max((startY - rect.top) / (startY - endY), 0), 1);

      let target = Math.round(progress * tokens.length);
      if (rect.top <= vh * 0.46 || progress >= 0.96) {
        target = tokens.length;
      } else if (vel > 420 && target > shown && target < tokens.length) {
        target = tokens[Math.min(target, tokens.length - 1)].wordEnd;
      }

      if (target !== shown) {
        shown = target;
        setRevealedCount(shown);
        setDone(shown >= tokens.length);
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [tokens]);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={`write-reveal ${done ? "is-complete" : ""} ${className}`}
      style={style}
      aria-label={text}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {tokens.map((tok, i) => {
          const isVisible = i < revealedCount;
          const isActiveNib = !done && i === revealedCount - 1;
          return (
            <span
              key={i}
              className={`write-glyph ${isVisible ? "is-inked" : ""} ${isActiveNib ? "is-nib" : ""}`}
            >
              {tok.char}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
