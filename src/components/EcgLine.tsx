"use client";

import { useEffect, useRef } from "react";
import { useApp } from "./AppContext";

// Smooth flowing Bezier calligraphic oscillograph tracing "a k a s h" across the screen center
const HERO_CURSIVE_AKASH_PATH =
  "M 0 46 " +
  "C 120 46, 200 46, 290 46 " +
  "C 312 46, 326 36, 336 28 C 344 22, 352 46, 366 46 " +
  "C 386 46, 396 22, 412 22 C 424 22, 424 44, 412 46 C 402 47, 398 32, 420 44 " +
  "C 434 52, 444 12, 444 12 C 444 12, 444 46, 444 46 C 444 38, 464 20, 474 26 C 464 34, 456 36, 478 46 " +
  "C 496 52, 506 22, 522 22 C 534 22, 534 44, 522 46 C 512 47, 508 32, 530 44 " +
  "C 548 52, 558 20, 574 22 C 586 24, 566 34, 580 38 C 594 42, 582 52, 566 46 " +
  "C 596 46, 608 12, 608 12 C 608 12, 608 46, 608 46 C 610 30, 634 22, 636 46 " +
  "C 648 46, 668 38, 682 46 C 694 52, 706 16, 718 46 C 726 62, 738 38, 750 46 " +
  "C 860 46, 1020 46, 1200 46";

function buildSmoothPulsePath(scrollProgress: number, ampScale: number): string {
  const amp = Math.min(20, 7 + ampScale * 13);
  let d = "M 0 46";
  const cycles = 7;
  const span = 1200 / cycles;
  const phase = (scrollProgress * 2.8) % 1;
  for (let i = 0; i < cycles; i++) {
    const x = i * span + phase * 36 - 18;
    const pY = 46 - amp * 0.24;
    const qY = 46 + amp * 0.34;
    const rY = 46 - amp;
    const sY = 46 + amp * 0.48;
    const tY = 46 - amp * 0.28;
    d += ` C ${(x + span * 0.1).toFixed(1)} 46, ${(x + span * 0.18).toFixed(1)} 46, ${(x + span * 0.24).toFixed(1)} 46`;
    d += ` C ${(x + span * 0.28).toFixed(1)} ${pY.toFixed(1)}, ${(x + span * 0.32).toFixed(1)} ${pY.toFixed(1)}, ${(x + span * 0.36).toFixed(1)} 46`;
    d += ` C ${(x + span * 0.39).toFixed(1)} ${qY.toFixed(1)}, ${(x + span * 0.43).toFixed(1)} ${rY.toFixed(1)}, ${(x + span * 0.46).toFixed(1)} ${rY.toFixed(1)}`;
    d += ` C ${(x + span * 0.49).toFixed(1)} ${rY.toFixed(1)}, ${(x + span * 0.52).toFixed(1)} ${sY.toFixed(1)}, ${(x + span * 0.56).toFixed(1)} 46`;
    d += ` C ${(x + span * 0.64).toFixed(1)} ${tY.toFixed(1)}, ${(x + span * 0.74).toFixed(1)} ${tY.toFixed(1)}, ${(x + span * 0.84).toFixed(1)} 46`;
  }
  return d + " C 1160 46, 1185 46, 1200 46";
}

function playEcgTick() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(980, ctx.currentTime);
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0004, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  } catch {
    // Web Audio awaiting user interaction gesture
  }
}

export function EcgLine() {
  const { soundMuted, ecgBootProgress, ecgBootDone } = useApp();
  const pathRef = useRef<SVGPathElement | null>(null);
  const labelRef = useRef<SVGTextElement | null>(null);
  const bootProgressRef = useRef(ecgBootProgress);
  const bootDoneRef = useRef(ecgBootDone);
  const soundMutedRef = useRef(soundMuted);

  useEffect(() => {
    bootProgressRef.current = ecgBootProgress;
    bootDoneRef.current = ecgBootDone;
  }, [ecgBootProgress, ecgBootDone]);

  useEffect(() => {
    soundMutedRef.current = soundMuted;
  }, [soundMuted]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let lastY = window.scrollY;
    let lastTime = performance.now();
    let smoothedVel = 0;
    let lastTickMs = 0;
    let rafId = 0;

    const update = () => {
      const now = performance.now();
      const dt = Math.max((now - lastTime) / 1000, 0.016);
      const y = window.scrollY;
      const vel = Math.abs(y - lastY) / dt;
      smoothedVel += (vel - smoothedVel) * 0.24;
      lastY = y;
      lastTime = now;

      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const p = Math.min(Math.max(y / maxScroll, 0), 1);
      const inHero = p < 0.16;

      if (pathRef.current) {
        if (inHero) {
          pathRef.current.setAttribute("d", HERO_CURSIVE_AKASH_PATH);
          const len = pathRef.current.getTotalLength();
          const bootSweep = bootDoneRef.current ? 1 : bootProgressRef.current;
          const scrollSweep = Math.min(0.45 + (p / 0.16) * 0.55, 1);
          const drawP = Math.min(bootSweep * scrollSweep + (bootDoneRef.current ? 0.55 : 0), 1);
          pathRef.current.style.strokeDasharray = `${len}`;
          pathRef.current.style.strokeDashoffset = `${len * (1 - drawP)}`;
        } else {
          const d = buildSmoothPulsePath(p, Math.min(smoothedVel / 1100, 1));
          pathRef.current.setAttribute("d", d);
          const len = pathRef.current.getTotalLength();
          const sweep = 0.25 + p * 0.75;
          pathRef.current.style.strokeDasharray = `${len}`;
          pathRef.current.style.strokeDashoffset = `${len * (1 - sweep)}`;
        }
      }

      if (labelRef.current) {
        const bootVis = bootDoneRef.current ? 1 : bootProgressRef.current;
        labelRef.current.style.opacity = inHero ? `${(0.28 * bootVis).toFixed(3)}` : "0.14";
      }

      if (!soundMutedRef.current && smoothedVel > 220 && now - lastTickMs > 420) {
        lastTickMs = now;
        playEcgTick();
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [ecgBootProgress, ecgBootDone]);

  return (
    <div className="ecg-center-watermark" aria-hidden="true">
      <svg viewBox="0 0 1200 92" preserveAspectRatio="none" className="ecg-svg">
        <defs>
          <linearGradient id="ecg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--c-bold)" stopOpacity="0.12" />
            <stop offset="30%" stopColor="var(--c-bold)" stopOpacity="0.72" />
            <stop offset="70%" stopColor="var(--c-bold)" stopOpacity="0.78" />
            <stop offset="100%" stopColor="var(--c-bold)" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path
          ref={pathRef}
          d={HERO_CURSIVE_AKASH_PATH}
          fill="none"
          stroke="url(#ecg-grad)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          ref={labelRef}
          x="600"
          y="78"
          textAnchor="middle"
          className="ecg-watermark-word"
          fill="url(#ecg-grad)"
        >
          akash · 72 bpm
        </text>
      </svg>
    </div>
  );
}
