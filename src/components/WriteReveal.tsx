"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

interface WriteRevealProps {
  text: string;
  italicSuffix?: string;
  className?: string;
  as?: "p" | "span" | "blockquote" | "div" | "strong" | "h1" | "h2";
  style?: React.CSSProperties;
  autoReveal?: boolean;
}

export function WriteReveal({
  text,
  italicSuffix,
  className = "",
  as: Tag = "p",
  style,
  autoReveal = false,
}: WriteRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const fullText = italicSuffix ? `${text}${italicSuffix}` : text;
  const splitIdx = text.length;
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [done, setDone] = useState(false);

  const tokens = useMemo(() => {
    const out: { char: string; wordEnd: number; isItalic: boolean }[] = [];
    let idx = 0;
    const words = fullText.split(/(\s+)/);
    for (const part of words) {
      const start = idx;
      const end = start + part.length;
      for (let i = 0; i < part.length; i++) {
        out.push({
          char: part[i],
          wordEnd: end,
          isItalic: start + i >= splitIdx,
        });
      }
      idx = end;
    }
    return out;
  }, [fullText, splitIdx]);

  useEffect(() => {
    const total = tokens.length;
    if (total === 0) {
      setDone(true);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealedCount(total);
      setDone(true);
      return;
    }

    const el = ref.current;
    const initialRect = el?.getBoundingClientRect();
    const initialVh = window.innerHeight || 800;
    const isAboveFold = Boolean(initialRect && initialRect.top < initialVh * 0.95);

    if (autoReveal || isAboveFold) {
      setRevealedCount(total);
      setDone(true);
      return;
    }

    let displayFloat = 0;
    let lastRendered = -1;
    let target = 0;

    const updateTargetFromViewport = () => {
      const node = ref.current;
      if (!node) return;
      const vh = window.innerHeight || 800;
      const rect = node.getBoundingClientRect();

      if (rect.top < vh * 0.98 && rect.bottom > 0) {
        const startY = vh * 0.98;
        const endY = vh * 0.2;
        const progress = Math.min(Math.max((startY - rect.top) / (startY - endY), 0), 1);
        let scrollTarget = Math.round(progress * total);

        if (rect.bottom <= vh * 0.9 || rect.top <= vh * 0.45 || progress >= 0.55) {
          scrollTarget = total;
        }
        target = Math.max(target, scrollTarget);
      }
    };

    // High-performance GSAP ticker for word-chunk batch reveal during fast scroll without jitter
    const tickerCallback = (_time: number, deltaTime: number) => {
      const dt = Math.min(Math.max(deltaTime / 1000, 0.008), 0.05);
      updateTargetFromViewport();

      if (displayFloat < target) {
        const gap = target - displayFloat;
        // Batch chunk acceleration during fast scrolling
        const chunkRate = Math.max(160, total * 4.2) + gap * 8.5;
        displayFloat = Math.min(target, displayFloat + chunkRate * dt);
      }

      const nextCount = Math.floor(displayFloat);
      if (nextCount !== lastRendered) {
        lastRendered = nextCount;
        setRevealedCount(nextCount);
        if (nextCount >= total) {
          setDone(true);
          gsap.ticker.remove(tickerCallback);
        }
      }
    };

    updateTargetFromViewport();
    if (target === 0) target = Math.round(total * 0.4);
    gsap.ticker.add(tickerCallback);

    return () => {
      gsap.ticker.remove(tickerCallback);
    };
  }, [tokens, autoReveal]);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={`write-reveal ${done ? "is-complete" : ""} ${className}`}
      style={style}
      aria-label={fullText}
    >
      <span className="sr-only">{fullText}</span>
      <span aria-hidden="true">
        {tokens.map((tok, i) => {
          const isVisible = i < revealedCount;
          const isActiveNib = !done && i === revealedCount - 1;
          return (
            <span
              key={i}
              className={`write-glyph ${tok.isItalic ? "is-italic" : ""} ${isVisible ? "is-inked" : ""} ${isActiveNib ? "is-nib" : ""}`}
            >
              {tok.char}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
