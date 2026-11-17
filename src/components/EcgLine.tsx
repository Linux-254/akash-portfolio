"use client";

import { useEffect, useRef } from "react";
import { useApp } from "./AppContext";

// Realistic multi-complex P-QRS-T clinical ECG waveform with an integrated
// cursive "Akash" signature flourish across the central beat (viewBox 0..1200 x 0..132, baseline y=62).
const MONITOR_ECG_PATH =
  "M 0 62 " +
  // Baseline lead-in -> Beat 1 (left telemetry complex)
  "L 72 62 " +
  "C 82 62, 88 53, 96 53 C 104 53, 109 62, 118 62 " + // P wave
  "L 128 62 L 134 70 L 143 16 L 152 82 L 160 62 " + // QRS complex
  "L 174 62 C 188 62, 196 47, 212 47 C 228 47, 238 62, 252 62 " + // T wave
  // Isoelectric -> Beat 2
  "L 304 62 " +
  "C 314 62, 320 53, 328 53 C 336 53, 341 62, 350 62 " + // P wave
  "L 360 62 L 366 70 L 375 18 L 384 80 L 392 62 " + // QRS complex
  "L 406 62 C 420 62, 428 48, 444 48 C 460 48, 470 62, 484 62 " + // T wave
  // Central Signature Complex framing "Akash"
  "L 516 62 " +
  "C 526 62, 534 52, 544 52 C 554 52, 560 62, 568 62 " + // P wave
  "L 578 62 L 585 74 L 598 10 L 610 86 L 620 62 " + // Prominent central R-spike
  "L 634 62 C 650 62, 660 44, 678 44 C 696 44, 706 62, 722 62 " + // Tall T wave
  // Isoelectric -> Beat 4
  "L 788 62 " +
  "C 798 62, 804 53, 812 53 C 820 53, 825 62, 834 62 " + // P wave
  "L 844 62 L 850 70 L 859 17 L 868 81 L 876 62 " + // QRS complex
  "L 890 62 C 904 62, 912 48, 928 48 C 944 48, 954 62, 968 62 " + // T wave
  // Beat 5 (right exit complex)
  "L 1020 62 " +
  "C 1030 62, 1036 53, 1044 53 C 1052 53, 1057 62, 1066 62 " + // P wave
  "L 1076 62 L 1082 70 L 1091 18 L 1100 80 L 1108 62 " + // QRS complex
  "L 1122 62 C 1136 62, 1144 49, 1158 49 C 1172 49, 1180 62, 1192 62 " + // T wave
  "L 1200 62";

// X positions of the 5 R-wave spikes in viewBox space
const R_SPIKES = [143, 375, 598, 859, 1091];

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
    gain.gain.setValueAtTime(0.014, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0004, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  } catch {
    // Web Audio awaiting user gesture
  }
}

export function EcgLine() {
  const { soundMuted, ecgBootProgress, ecgBootDone } = useApp();
  const activePathRef = useRef<SVGPathElement | null>(null);
  const headDotRef = useRef<SVGCircleElement | null>(null);
  const headHaloRef = useRef<SVGCircleElement | null>(null);
  const leadGradRef = useRef<SVGLinearGradientElement | null>(null);
  const wrapGradRef = useRef<SVGLinearGradientElement | null>(null);
  const maskLeadRef = useRef<SVGRectElement | null>(null);
  const maskWrapRef = useRef<SVGRectElement | null>(null);
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
    const pathEl = activePathRef.current;
    if (!pathEl) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (maskLeadRef.current) {
        maskLeadRef.current.setAttribute("x", "0");
        maskLeadRef.current.setAttribute("width", "1200");
        maskLeadRef.current.setAttribute("fill", "#ffffff");
      }
      if (labelRef.current) labelRef.current.style.opacity = "0.7";
      return;
    }

    // Pre-sample the ECG path into a monotonic x-indexed Y lookup table once on mount
    // so per-frame sweep cursor tracking does ZERO SVG DOM geometry queries.
    const totalLen = pathEl.getTotalLength();
    const LUT_SIZE = 600;
    const yLut = new Float32Array(LUT_SIZE + 1).fill(62);
    for (let i = 0; i <= 1400; i++) {
      const pt = pathEl.getPointAtLength((i / 1400) * totalLen);
      const bucket = Math.min(LUT_SIZE, Math.max(0, Math.round((pt.x / 1200) * LUT_SIZE)));
      yLut[bucket] = pt.y;
    }

    const sampleY = (x: number): number => {
      const clamped = ((x % 1200) + 1200) % 1200;
      const exact = (clamped / 1200) * LUT_SIZE;
      const lo = Math.floor(exact);
      const hi = Math.min(LUT_SIZE, lo + 1);
      const frac = exact - lo;
      return yLut[lo] * (1 - frac) + yLut[hi] * frac;
    };

    let lastY = window.scrollY;
    let lastTime = performance.now();
    let scrollBoost = 0;
    let lastSpikeIdx = -1;
    let spikeFlash = 0;
    let sweepPx = 0;
    let rafId = 0;

    // 4.4s full monitor sweep across 5 cardiac beats (~68-72 BPM steady sinus rhythm)
    const SWEEP_SPEED = 1200 / 4.4;
    const TRAIL_WIDTH = 660;

    const tick = (now: number) => {
      const dt = Math.min(Math.max((now - lastTime) / 1000, 0.001), 0.05);
      lastTime = now;

      const curScroll = window.scrollY;
      const instantVel = Math.abs(curScroll - lastY) / dt;
      lastY = curScroll;
      scrollBoost += (Math.min(instantVel / 1800, 0.35) - scrollBoost) * (1 - Math.exp(-4 * dt));

      const speedMul = 1 + scrollBoost;
      sweepPx = (sweepPx + SWEEP_SPEED * speedMul * dt) % 1200;

      // Detect crossing an R-wave peak to trigger clinical monitor systole pulse
      let activeSpike = -1;
      for (let i = 0; i < R_SPIKES.length; i++) {
        if (Math.abs(sweepPx - R_SPIKES[i]) < 14) {
          activeSpike = i;
          break;
        }
      }
      if (activeSpike !== -1 && activeSpike !== lastSpikeIdx) {
        lastSpikeIdx = activeSpike;
        spikeFlash = 1;
        if (!soundMutedRef.current && scrollBoost > 0.04) {
          playEcgTick();
        }
      } else if (activeSpike === -1) {
        lastSpikeIdx = -1;
      }
      spikeFlash *= Math.exp(-5.4 * dt);

      const tailStart = sweepPx - TRAIL_WIDTH;

      if (maskLeadRef.current && maskWrapRef.current && leadGradRef.current && wrapGradRef.current) {
        leadGradRef.current.setAttribute("x1", tailStart.toFixed(1));
        leadGradRef.current.setAttribute("x2", sweepPx.toFixed(1));

        if (tailStart >= 0) {
          maskLeadRef.current.setAttribute("x", tailStart.toFixed(1));
          maskLeadRef.current.setAttribute("width", TRAIL_WIDTH.toFixed(1));
          maskWrapRef.current.setAttribute("width", "0");
        } else {
          // Seamless wrap across the 1200 -> 0 seam using matching userSpaceOnUse coordinates
          maskLeadRef.current.setAttribute("x", "0");
          maskLeadRef.current.setAttribute("width", sweepPx.toFixed(1));
          const wrapWidth = -tailStart;
          const wrapX = 1200 - wrapWidth;
          wrapGradRef.current.setAttribute("x1", wrapX.toFixed(1));
          wrapGradRef.current.setAttribute("x2", (1200 + sweepPx).toFixed(1));
          maskWrapRef.current.setAttribute("x", wrapX.toFixed(1));
          maskWrapRef.current.setAttribute("width", wrapWidth.toFixed(1));
        }
      }

      const curY = sampleY(sweepPx);
      const bootVis = bootDoneRef.current ? 1 : Math.min(1, bootProgressRef.current + 0.35);

      if (headDotRef.current && headHaloRef.current) {
        headDotRef.current.setAttribute("cx", sweepPx.toFixed(1));
        headDotRef.current.setAttribute("cy", curY.toFixed(1));
        headDotRef.current.setAttribute("r", (3.1 + spikeFlash * 1.9).toFixed(2));
        headDotRef.current.style.opacity = `${(0.95 * bootVis).toFixed(3)}`;

        headHaloRef.current.setAttribute("cx", sweepPx.toFixed(1));
        headHaloRef.current.setAttribute("cy", curY.toFixed(1));
        headHaloRef.current.setAttribute("r", (8.5 + spikeFlash * 9.5).toFixed(2));
        headHaloRef.current.style.opacity = `${((0.35 + spikeFlash * 0.45) * bootVis).toFixed(3)}`;
      }

      // Continuous lub-dub physiological pulse on the "Akash" monitor signature synced with systole
      if (labelRef.current) {
        const beatPhase = (now * 0.00118) % 1;
        const lub = Math.exp(-Math.pow((beatPhase - 0.12) * 16, 2));
        const dub = Math.exp(-Math.pow((beatPhase - 0.28) * 16, 2)) * 0.65;
        const sysWave = Math.min(1, lub + dub + spikeFlash * 0.55);

        const labelAlpha = (0.44 + sysWave * 0.48) * bootVis;
        const labelScale = 1 + sysWave * 0.045;
        labelRef.current.style.opacity = labelAlpha.toFixed(3);
        labelRef.current.style.transform = `scale(${labelScale.toFixed(4)})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="ecg-center-watermark" aria-hidden="true">
      <svg viewBox="0 0 1200 132" preserveAspectRatio="none" className="ecg-svg">
        <defs>
          <linearGradient
            ref={leadGradRef}
            id="ecg-lead-grad"
            gradientUnits="userSpaceOnUse"
            x1="-660"
            y1="0"
            x2="0"
            y2="0"
          >
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="28%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="76%" stopColor="#ffffff" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          <linearGradient
            ref={wrapGradRef}
            id="ecg-wrap-grad"
            gradientUnits="userSpaceOnUse"
            x1="540"
            y1="0"
            x2="1200"
            y2="0"
          >
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="28%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="76%" stopColor="#ffffff" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          <mask id="ecg-sweep-mask">
            <rect x="0" y="0" width="1200" height="132" fill="#000000" />
            <rect
              ref={maskWrapRef}
              x="0"
              y="0"
              width="0"
              height="132"
              fill="url(#ecg-wrap-grad)"
            />
            <rect
              ref={maskLeadRef}
              x="0"
              y="0"
              width="660"
              height="132"
              fill="url(#ecg-lead-grad)"
            />
          </mask>

          <radialGradient id="ecg-phosphor-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--c-bold)" stopOpacity="0.95" />
            <stop offset="55%" stopColor="var(--c-bold)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--c-bold)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Subtle dim phosphor persistence trace */}
        <path
          d={MONITOR_ECG_PATH}
          fill="none"
          stroke="var(--c-bold)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.16"
        />

        {/* Active sweeping monitor trace */}
        <path
          ref={activePathRef}
          d={MONITOR_ECG_PATH}
          fill="none"
          stroke="var(--c-bold)"
          strokeWidth="2.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          mask="url(#ecg-sweep-mask)"
        />

        {/* Sweeping phosphor beam halo + dot */}
        <circle
          ref={headHaloRef}
          cx="0"
          cy="62"
          r="9"
          fill="url(#ecg-phosphor-halo)"
        />
        <circle
          ref={headDotRef}
          cx="0"
          cy="62"
          r="3.2"
          fill="var(--c-neutral-light)"
          stroke="var(--c-bold)"
          strokeWidth="1.75"
        />

        {/* Centered "Akash" telemetry signature pulsing cleanly on each heartbeat */}
        <text
          ref={labelRef}
          x="600"
          y="116"
          textAnchor="middle"
          className="ecg-watermark-word"
          fill="var(--c-bold)"
        >
          Akash
        </text>
      </svg>
    </div>
  );
}
