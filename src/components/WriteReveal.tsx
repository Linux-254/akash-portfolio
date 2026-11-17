"use client";

import React, { useEffect, useMemo, useRef } from "react";
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
  const glyphsHostRef = useRef<HTMLSpanElement | null>(null);
  const fullText = italicSuffix ? `${text}${italicSuffix}` : text;
  const splitIdx = text.length;

  const tokens = useMemo(() => {
    const out: { char: string; isItalic: boolean }[] = [];
    for (let i = 0; i < fullText.length; i++) {
      out.push({
        char: fullText[i],
        isItalic: i >= splitIdx,
      });
    }
    return out;
  }, [fullText, splitIdx]);

  useEffect(() => {
    const host = glyphsHostRef.current;
    const node = ref.current;
    if (!host || !node) return;

    const glyphs = Array.from(host.children) as HTMLElement[];
    const total = glyphs.length;
    if (total === 0) {
      node.classList.add("is-complete");
      return;
    }

    const markAllInked = () => {
      for (let i = 0; i < total; i++) {
        glyphs[i].classList.add("is-inked");
        glyphs[i].classList.remove("is-nib");
      }
      node.classList.add("is-complete");
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markAllInked();
      return;
    }

    let revealedCount = 0;
    let displayFloat = 0;
    let target = 0;
    let activeInTicker = false;
    let finished = false;

    const applyCount = (nextCount: number) => {
      if (nextCount === revealedCount) return;
      if (nextCount > revealedCount) {
        if (revealedCount > 0 && revealedCount - 1 < total) {
          glyphs[revealedCount - 1].classList.remove("is-nib");
        }
        const limit = Math.min(nextCount, total);
        for (let i = revealedCount; i < limit; i++) {
          glyphs[i].classList.add("is-inked");
        }
        if (limit < total && limit > 0) {
          glyphs[limit - 1].classList.add("is-nib");
        }
      }
      revealedCount = nextCount;
      if (revealedCount >= total) {
        finished = true;
        markAllInked();
      }
    };

    const initialRect = node.getBoundingClientRect();
    const initialVh = window.innerHeight || 800;
    const isInitialVisible = initialRect.top < initialVh * 0.96;

    // Auto-reveal and above-the-fold headlines glide smoothly without jitter right after paint
    if (autoReveal || isInitialVisible) {
      const rate = Math.max(total / 0.48, 85);
      const introTick = (_time: number, deltaTime: number) => {
        if (finished) {
          gsap.ticker.remove(introTick);
          return;
        }
        const dt = Math.min(Math.max(deltaTime / 1000, 0.004), 0.05);
        displayFloat = Math.min(total, displayFloat + rate * dt);
        applyCount(Math.floor(displayFloat));
        if (displayFloat >= total) {
          applyCount(total);
          gsap.ticker.remove(introTick);
        }
      };
      gsap.ticker.add(introTick);
      return () => {
        gsap.ticker.remove(introTick);
      };
    }

    const updateTargetFromViewport = () => {
      const vh = window.innerHeight || 800;
      const rect = node.getBoundingClientRect();
      if (rect.top < vh * 0.98 && rect.bottom > 0) {
        const startY = vh * 0.96;
        const endY = vh * 0.34;
        const progress = Math.min(Math.max((startY - rect.top) / (startY - endY), 0), 1);
        let scrollTarget = Math.round(progress * total);

        if (rect.bottom <= vh * 0.9 || rect.top <= vh * 0.42 || progress >= 0.6) {
          scrollTarget = total;
        }
        target = Math.max(target, scrollTarget);
      }
    };

    const tickerCallback = (_time: number, deltaTime: number) => {
      if (finished) {
        gsap.ticker.remove(tickerCallback);
        activeInTicker = false;
        return;
      }
      const dt = Math.min(Math.max(deltaTime / 1000, 0.004), 0.05);
      updateTargetFromViewport();

      if (displayFloat < target) {
        const gap = target - displayFloat;
        const speed = Math.max(110, total * 2.4) + gap * 10.5;
        displayFloat = Math.min(target, displayFloat + speed * dt);
        applyCount(Math.floor(displayFloat));
      }

      if (revealedCount >= total) {
        gsap.ticker.remove(tickerCallback);
        activeInTicker = false;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && !finished && !activeInTicker) {
          activeInTicker = true;
          updateTargetFromViewport();
          target = Math.max(target, Math.round(total * 0.25));
          gsap.ticker.add(tickerCallback);
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (activeInTicker) {
        gsap.ticker.remove(tickerCallback);
      }
    };
  }, [tokens, autoReveal]);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={`write-reveal ${className}`}
      style={style}
      aria-label={fullText}
    >
      <span className="sr-only">{fullText}</span>
      <span ref={glyphsHostRef} aria-hidden="true">
        {tokens.map((tok, i) => (
          <span
            key={i}
            className={`write-glyph ${tok.isItalic ? "is-italic" : ""}`}
          >
            {tok.char}
          </span>
        ))}
      </span>
    </Tag>
  );
}
