"use client";

import React, { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { useApp } from "./AppContext";

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
  const { isTransitioning } = useApp();
  const isTransitioningRef = useRef(isTransitioning);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

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
    let finished = false;
    let enteredScreen = false;

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
    const initialVw = window.innerWidth || 1200;
    const isInitialVisible =
      initialRect.top < initialVh * 0.94 &&
      initialRect.bottom > 0 &&
      initialRect.left < initialVw * 0.96 &&
      initialRect.right > 0;

    // Hero / above-the-fold typing waits until page reveal starts, then types at a crisp visible cadence
    if (autoReveal || isInitialVisible) {
      let waitElapsed = 0;
      const rate = Math.min(Math.max(total / 1.15, 34), 68);
      const introTick = (_time: number, deltaTime: number) => {
        if (finished) {
          gsap.ticker.remove(introTick);
          return;
        }
        const dt = Math.min(Math.max(deltaTime / 1000, 0.004), 0.05);
        if (isTransitioningRef.current && waitElapsed < 0.7) {
          waitElapsed += dt;
          return;
        }
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

    // Below-the-fold & horizontal-track scroll typing: visibly writes out as the block enters viewport
    const updateFromViewport = (dt: number) => {
      if (finished) return;
      const vh = window.innerHeight || 800;
      const vw = window.innerWidth || 1200;
      const rect = node.getBoundingClientRect();

      const inVertical = rect.top < vh * 0.92 && rect.bottom > 0;
      const inHorizontal = rect.left < vw * 0.95 && rect.right > vw * 0.02;

      if (inVertical && inHorizontal) {
        enteredScreen = true;
        const vProg = Math.min(
          Math.max((vh * 0.92 - rect.top) / (vh * 0.44), 0),
          1,
        );
        const hProg = Math.min(
          Math.max((vw * 0.95 - rect.left) / (vw * 0.42), 0),
          1,
        );
        const combined = Math.min(vProg, hProg);
        let scrollTarget = Math.round(combined * total);

        if (combined >= 0.68 || (rect.top < vh * 0.46 && hProg >= 0.42)) {
          scrollTarget = total;
        }
        // Once visibly entering viewport, ensure smooth minimum forward progress
        target = Math.max(target, scrollTarget, Math.min(total, Math.round(total * 0.2)));
      } else if (enteredScreen && rect.bottom <= vh * 0.4) {
        target = total;
      }

      if (enteredScreen && target > 0 && displayFloat < target) {
        const gap = target - displayFloat;
        const rate = Math.min(Math.max(total * 1.15, 36), 88) + gap * 4.5;
        displayFloat = Math.min(target, displayFloat + rate * dt);
        applyCount(Math.floor(displayFloat));
      } else if (enteredScreen && target >= total && displayFloat < total) {
        const rate = Math.min(Math.max(total * 1.15, 36), 88);
        displayFloat = Math.min(total, displayFloat + rate * dt);
        applyCount(Math.floor(displayFloat));
      }
    };

    const tick = (_time: number, deltaTime: number) => {
      if (finished) {
        gsap.ticker.remove(tick);
        return;
      }
      const dt = Math.min(Math.max(deltaTime / 1000, 0.004), 0.05);
      updateFromViewport(dt);
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
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
