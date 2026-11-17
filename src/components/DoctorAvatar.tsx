"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type AvatarPose = "wave" | "idle" | "working" | "point" | "wear";

export function DoctorAvatar() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<SVGSVGElement | null>(null);
  const headGroupRef = useRef<SVGGElement | null>(null);
  const pupilsRef = useRef<SVGGElement | null>(null);
  const eyelidsRef = useRef<SVGGElement | null>(null);
  const rightArmRef = useRef<SVGGElement | null>(null);
  const leftArmRef = useRef<SVGGElement | null>(null);
  const tabletRef = useRef<SVGGElement | null>(null);
  const neckStethRef = useRef<SVGGElement | null>(null);

  const [pose, setPose] = useState<AvatarPose>("wave");
  const [minimized, setMinimized] = useState(false);
  const [callout, setCallout] = useState<string>("SG_AKASH · Clinical Guide");
  const pointTimerRef = useRef<number>(0);
  const lastScrollY = useRef(0);
  const lastScrollT = useRef(0);

  // Initial welcome wave once, then settle into idle or wear depending on scroll position
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPose((prev) => (prev === "wave" ? "idle" : prev));
    }, 2400);
    return () => window.clearTimeout(timer);
  }, []);

  // Subtle breathing + blinking loop
  useEffect(() => {
    if (minimized || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.to(".avatar-torso-group", {
        scaleY: 1.018,
        y: -1.5,
        transformOrigin: "center bottom",
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const blinkTl = gsap.timeline({ repeat: -1, repeatDelay: 3.4 });
      blinkTl
        .to(eyelidsRef.current, { scaleY: 1, duration: 0.08, transformOrigin: "center center" })
        .to(eyelidsRef.current, { scaleY: 0.05, duration: 0.11, transformOrigin: "center center" });
    }, rootRef);
    return () => ctx.revert();
  }, [minimized]);

  // Pose-driven GSAP rig articulation
  useEffect(() => {
    if (minimized) return;
    const rightArm = rightArmRef.current;
    const leftArm = leftArmRef.current;
    const tablet = tabletRef.current;
    const neckSteth = neckStethRef.current;
    if (!rightArm || !leftArm) return;

    gsap.killTweensOf([rightArm, leftArm, tablet, neckSteth]);

    if (pose === "wave") {
      gsap.to(rightArm, { rotate: -38, x: 4, y: -12, transformOrigin: "72px 136px", duration: 0.45 });
      gsap.to(rightArm, {
        rotate: -52,
        duration: 0.35,
        repeat: 4,
        yoyo: true,
        delay: 0.35,
        ease: "sine.inOut",
      });
      gsap.to(tablet, { opacity: 0, y: 12, duration: 0.3 });
      gsap.to(neckSteth, { opacity: 0, duration: 0.35 });
    } else if (pose === "point") {
      gsap.to(rightArm, { rotate: -58, x: -6, y: -10, transformOrigin: "72px 136px", duration: 0.35, ease: "power2.out" });
      gsap.to(leftArm, { rotate: 8, transformOrigin: "128px 136px", duration: 0.35 });
      gsap.to(tablet, { opacity: 0.2, duration: 0.25 });
    } else if (pose === "working") {
      gsap.to(leftArm, { rotate: 24, x: -6, y: -8, transformOrigin: "128px 136px", duration: 0.38 });
      gsap.to(rightArm, { rotate: -18, x: 4, y: -6, transformOrigin: "72px 136px", duration: 0.38 });
      gsap.to(tablet, { opacity: 1, y: 0, duration: 0.35 });
      gsap.to(neckSteth, { opacity: 1, duration: 0.4 });
    } else if (pose === "wear") {
      gsap.to(leftArm, { rotate: 4, x: 0, y: 0, transformOrigin: "128px 136px", duration: 0.55 });
      gsap.to(rightArm, { rotate: -4, x: 0, y: 0, transformOrigin: "72px 136px", duration: 0.55 });
      gsap.to(tablet, { opacity: 0, y: 10, duration: 0.35 });
      gsap.to(neckSteth, { opacity: 1, scale: 1, duration: 0.55, ease: "power2.out" });
    } else {
      gsap.to(leftArm, { rotate: 0, x: 0, y: 0, transformOrigin: "128px 136px", duration: 0.5 });
      gsap.to(rightArm, { rotate: 0, x: 0, y: 0, transformOrigin: "72px 136px", duration: 0.5 });
      gsap.to(tablet, { opacity: 0, y: 10, duration: 0.35 });
      gsap.to(neckSteth, { opacity: 0.15, duration: 0.45 });
    }
  }, [pose, minimized]);

  // Pointer head + gaze tracking, click/selection callouts, and scroll-to-wear transition
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (minimized || !headGroupRef.current || !pupilsRef.current) return;
      const nx = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      const ny = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
      gsap.to(headGroupRef.current, {
        rotate: nx * 4.5,
        x: nx * 2.5,
        y: ny * 2,
        transformOrigin: "100px 96px",
        duration: 0.4,
        overwrite: "auto",
      });
      gsap.to(pupilsRef.current, {
        x: nx * 2.2,
        y: ny * 1.4,
        duration: 0.25,
        overwrite: "auto",
      });
    };

    const onClick = (e: MouseEvent) => {
      if (minimized) return;
      const target = e.target as HTMLElement | null;
      if (!target || rootRef.current?.contains(target)) return;
      const section = target.closest("section, article, a, button");
      const rawText =
        section?.getAttribute("aria-label") ||
        section?.querySelector("h1, h2, .mono-label")?.textContent ||
        "Inspecting record";
      setCallout(rawText.slice(0, 32));
      setPose("point");
      clearTimeout(pointTimerRef.current);
      pointTimerRef.current = window.setTimeout(() => {
        const scrollRatio =
          window.scrollY /
          Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        setPose(scrollRatio > 0.22 ? "wear" : "idle");
      }, 1450);
    };

    let idleAfterScroll = 0;
    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max((now - lastScrollT.current) / 1000, 0.016);
      const vel = Math.abs(window.scrollY - lastScrollY.current) / dt;
      lastScrollY.current = window.scrollY;
      lastScrollT.current = now;

      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const p = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);

      if (vel > 220) {
        setPose("working");
        setCallout("Reviewing notes...");
      } else if (p > 0.24) {
        setPose("wear");
        setCallout("Stethoscope docked");
      } else {
        setPose("idle");
        setCallout("SG_AKASH · Clinical Guide");
      }

      clearTimeout(idleAfterScroll);
      idleAfterScroll = window.setTimeout(() => {
        setPose(p > 0.24 ? "wear" : "idle");
      }, 900);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(pointTimerRef.current);
      clearTimeout(idleAfterScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [minimized]);

  return (
    <aside
      ref={rootRef}
      className={`doctor-avatar-dock ${minimized ? "is-minimized" : ""}`}
      aria-label="Abdikhaliq clinical guide avatar"
    >
      <div className="avatar-controls-row">
        <span className="avatar-bubble mono-label">{callout}</span>
        <button
          type="button"
          className="avatar-min-btn"
          aria-expanded={!minimized}
          aria-label={minimized ? "Expand Akash guide" : "Minimize Akash guide"}
          onClick={() => setMinimized((m) => !m)}
        >
          {minimized ? "+" : "−"}
        </button>
      </div>

      {!minimized && (
        <svg
          ref={rigRef}
          viewBox="0 0 200 260"
          className="doctor-avatar-svg"
          role="img"
          aria-label="Stylized 3D-shaded doctor avatar modeled after Abdikhaliq Abdi"
        >
          <defs>
            {/* Warm medium-deep brown skin radial shading per likeness spec */}
            <radialGradient id="skin-grad" cx="42%" cy="35%" r="68%">
              <stop offset="0%" stopColor="#9A6445" />
              <stop offset="55%" stopColor="#7A4B33" />
              <stop offset="100%" stopColor="#5E3825" />
            </radialGradient>
            <linearGradient id="suit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#26292d" />
              <stop offset="55%" stopColor="#121417" />
              <stop offset="100%" stopColor="#07080a" />
            </linearGradient>
            <linearGradient id="tie-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--c-bold) 30%, #4b1d36)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--c-bold) 42%, #2b0f1e)" />
            </linearGradient>
            <linearGradient id="lens-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--c-bold)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
            </linearGradient>
            <radialGradient id="avatar-aura" cx="50%" cy="55%" r="50%">
              <stop offset="0%" stopColor="var(--c-bold)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--c-bold)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="100" cy="142" r="88" fill="url(#avatar-aura)" />

          {/* Left Arm */}
          <g ref={leftArmRef} className="avatar-left-arm">
            <path
              d="M 134 132 C 156 146, 162 184, 150 220 C 145 232, 132 230, 130 218 C 136 188, 134 162, 122 146 Z"
              fill="url(#suit-grad)"
            />
            <ellipse cx="140" cy="224" rx="8" ry="10" fill="url(#skin-grad)" />
          </g>

          {/* Torso: Tailored Black Suit + Waistcoat + Crisp White Shirt + Tie */}
          <g className="avatar-torso-group">
            <path
              d="M 52 252 L 58 144 C 60 130, 74 124, 100 124 C 126 124, 140 130, 142 144 L 148 252 Z"
              fill="url(#suit-grad)"
            />
            {/* Crisp White Dress Shirt & Collar */}
            <polygon points="84,126 116,126 100,192" fill="#f7f9f9" />
            <polygon points="84,126 100,138 100,126" fill="#e5eaec" />
            <polygon points="116,126 100,138 100,126" fill="#e5eaec" />
            {/* Deep Burgundy-Blue Tie */}
            <polygon points="96,133 104,133 106,184 100,196 94,184" fill="url(#tie-grad)" />
            {/* Suit Lapels */}
            <polygon points="80,126 68,148 82,190 94,186" fill="#181b1f" stroke="#2c3138" strokeWidth="0.6" />
            <polygon points="120,126 132,148 118,190 106,186" fill="#181b1f" stroke="#2c3138" strokeWidth="0.6" />
            {/* Waistcoat V */}
            <path d="M 80 176 L 100 198 L 120 176 L 120 252 L 80 252 Z" fill="#111316" />
            <circle cx="100" cy="208" r="2" fill="#505860" />
            <circle cx="100" cy="226" r="2" fill="#505860" />
          </g>

          {/* Neck Stethoscope Worn Around Collar (Fades in on scroll wear) */}
          <g ref={neckStethRef} className="collar-steth" style={{ opacity: 0 }}>
            <path
              d="M 76 125 C 62 152, 72 184, 90 190 C 102 194, 118 190, 126 172 C 132 156, 130 135, 124 125"
              fill="none"
              stroke="var(--c-neutral-dark)"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <circle cx="84" cy="186" r="8.5" fill="#d0d7da" stroke="var(--c-bold)" strokeWidth="2.2" />
            <circle cx="84" cy="186" r="4" fill="#8fa0a4" />
            <path d="M 122 155 C 128 164, 134 176, 124 184" fill="none" stroke="#b6c2c6" strokeWidth="2.1" strokeLinecap="round" />
            <circle cx="123" cy="184" r="2.6" fill="var(--c-neutral-dark)" />
          </g>

          {/* Neck */}
          <path d="M 88 106 L 112 106 L 114 132 Q 100 138 86 132 Z" fill="#6b3f29" />

          {/* Head, Hair, Trimmed Beard & Rounded Rectangular Navy-Blue Glasses */}
          <g ref={headGroupRef} className="avatar-head-group">
            {/* Ears */}
            <ellipse cx="70" cy="84" rx="5.5" ry="9.5" fill="#6b3f29" />
            <ellipse cx="130" cy="84" rx="5.5" ry="9.5" fill="#6b3f29" />
            {/* Slim Face */}
            <path
              d="M 72 68 C 72 48, 128 48, 128 68 C 129 90, 121 112, 100 116 C 79 112, 71 90, 72 68 Z"
              fill="url(#skin-grad)"
            />
            {/* Tightly Curled Black Hair (Fuller top, tapered sides) */}
            <path
              d="M 70 68 C 67 52, 74 34, 88 30 C 98 26, 114 28, 124 36 C 132 45, 132 58, 129 68 C 127 56, 120 48, 100 48 C 80 48, 73 56, 70 68 Z"
              fill="#111214"
            />
            <circle cx="82" cy="38" r="6.5" fill="#141619" />
            <circle cx="94" cy="34" r="7.5" fill="#141619" />
            <circle cx="107" cy="34" r="7.5" fill="#141619" />
            <circle cx="118" cy="40" r="6.2" fill="#141619" />
            {/* Neatly Trimmed Connected Jawline Beard + Moustache */}
            <path
              d="M 73 84 C 74 102, 85 117, 100 118 C 115 117, 126 102, 127 84 C 124 95, 115 107, 100 109 C 85 107, 76 95, 73 84 Z"
              fill="#141517"
            />
            <path d="M 88 94 Q 100 90 112 94 Q 100 96 88 94 Z" fill="#141517" />
            {/* Calm Slight Smile */}
            <path d="M 92 99 Q 100 103 108 99" fill="none" stroke="#47281a" strokeWidth="1.8" strokeLinecap="round" />

            {/* Eyebrows */}
            <path d="M 80 68 Q 88 65 95 68" fill="none" stroke="#111214" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M 105 68 Q 112 65 120 68" fill="none" stroke="#111214" strokeWidth="2.1" strokeLinecap="round" />

            {/* Eyes & Blink Eyelids */}
            <ellipse cx="87.5" cy="77" rx="5.2" ry="3.8" fill="#ffffff" />
            <ellipse cx="112.5" cy="77" rx="5.2" ry="3.8" fill="#ffffff" />
            <g ref={pupilsRef}>
              <circle cx="88" cy="77" r="2.5" fill="#191614" />
              <circle cx="89" cy="76" r="0.8" fill="#ffffff" />
              <circle cx="113" cy="77" r="2.5" fill="#191614" />
              <circle cx="114" cy="76" r="0.8" fill="#ffffff" />
            </g>
            <g ref={eyelidsRef} style={{ transform: "scaleY(0.05)" }}>
              <rect x="81" y="72" width="13" height="9" rx="3" fill="#7A4B33" />
              <rect x="106" y="72" width="13" height="9" rx="3" fill="#7A4B33" />
            </g>

            {/* Thin Dark-Navy Translucent Rounded-Rectangular Glasses (Always visible) */}
            <g className="avatar-glasses">
              <rect x="75.5" y="70" width="21" height="14" rx="4.5" fill="url(#lens-sheen)" stroke="#112236" strokeWidth="1.9" />
              <rect x="103.5" y="70" width="21" height="14" rx="4.5" fill="url(#lens-sheen)" stroke="#112236" strokeWidth="1.9" />
              <path d="M 96.5 76 Q 100 74.5 103.5 76" fill="none" stroke="#112236" strokeWidth="1.8" />
              <line x1="72" y1="76" x2="75.5" y2="76" stroke="#112236" strokeWidth="1.6" />
              <line x1="124.5" y1="76" x2="128" y2="76" stroke="#112236" strokeWidth="1.6" />
            </g>
          </g>

          {/* Clinical Tablet (Visible in working scroll state) */}
          <g ref={tabletRef} style={{ opacity: 0 }}>
            <rect x="64" y="176" width="62" height="42" rx="5" fill="#132026" stroke="var(--c-bold)" strokeWidth="1.5" />
            <line x1="72" y1="188" x2="114" y2="188" stroke="var(--c-bold)" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="72" y1="196" x2="108" y2="196" stroke="#c8d6d8" strokeWidth="1.2" strokeOpacity="0.6" />
            <line x1="72" y1="204" x2="102" y2="204" stroke="#c8d6d8" strokeWidth="1.2" strokeOpacity="0.6" />
          </g>

          {/* Right Arm (Interactive Wave / Point / Tablet Hold) */}
          <g ref={rightArmRef} className="avatar-right-arm">
            <path
              d="M 66 132 C 44 146, 38 184, 50 220 C 55 232, 68 230, 70 218 C 64 188, 66 162, 78 146 Z"
              fill="url(#suit-grad)"
            />
            <ellipse cx="60" cy="224" rx="8" ry="10" fill="url(#skin-grad)" />
          </g>
        </svg>
      )}
    </aside>
  );
}
