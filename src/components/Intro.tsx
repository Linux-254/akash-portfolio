"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import content from "@/content.json";
import { useApp } from "./AppContext";

export function Intro() {
  const { introDone, completeIntro } = useApp();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (introDone) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      completeIntro();
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: completeIntro,
      });

      tl.fromTo(
        dropRef.current,
        { scale: 0.25, opacity: 0.45 },
        { scale: 1.6, opacity: 0.22, duration: 0.65, ease: "power3.out" },
      )
        .fromTo(
          ".intro-ribbon",
          { yPercent: -100, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
          0,
        )
        .to([dropRef.current, ".intro-ribbon"], {
          opacity: 0,
          scale: 0.9,
          duration: 0.45,
          delay: 0.45,
          ease: "power2.inOut",
        });
    }, rootRef);

    const fallback = window.setTimeout(completeIntro, 1800);
    return () => {
      clearTimeout(fallback);
      ctx.revert();
    };
  }, [introDone, completeIntro]);

  if (introDone) return null;

  return (
    <div ref={rootRef} className="intro-stage" aria-hidden="true">
      <div ref={dropRef} className="intro-ink-drop" />
      <div className="intro-ribbon">
        <span className="mono-label">
          {content.owner.displayName} · {content.owner.handle}
        </span>
      </div>
    </div>
  );
}
