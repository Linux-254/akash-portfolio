"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import content from "@/content.json";
import { useApp } from "./AppContext";
import { TransitionLink } from "./TransitionLink";
import { NavOverlay } from "./NavOverlay";

const ROUTE_LEADS: Record<string, string> = {
  "/": "CH-01 // OVERVIEW",
  "/about": "CH-02 // BIOGRAPHY",
  "/leadership": "CH-03 // UNSA · AMSUN",
  "/initiatives": "CH-04 // CBO MENTORSHIP",
  "/contact": "CH-05 // DISPATCH",
};

// Sequential smooth Bezier paths forming "A K A S H" calibrated cleanly to sync with ecgBootProgress
const LETTER_PATHS = [
  "M 4 28 C 8 18, 12 6, 16 6 C 20 6, 24 18, 28 28 M 9 20 Q 16 17 23 20",
  "M 38 6 C 38 14, 38 22, 38 28 M 52 7 C 46 12, 42 16, 38 18 C 44 21, 48 24, 53 28",
  "M 62 28 C 66 18, 70 6, 74 6 C 78 6, 82 18, 86 28 M 67 20 Q 74 17 81 20",
  "M 109 9 C 102 5, 93 8, 94 14 C 95 19, 110 18, 110 24 C 110 29, 98 30, 93 26",
  "M 120 6 L 120 28 M 120 17 C 126 16, 132 16, 138 17 M 138 6 L 138 28",
];

export function Nav() {
  const {
    menuOpen,
    toggleMenuWithWater,
    triggerWaterBurst,
    ecgBootProgress,
    ecgBootDone,
    setCursorMode,
  } = useApp();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const magneticRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 90 && y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 6 || y < 50) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleMagneticMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const btn = magneticRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.28;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.28;
    btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const handleMagneticLeave = () => {
    if (magneticRef.current) magneticRef.current.style.transform = "translate3d(0, 0, 0)";
    setCursorMode("default");
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX || rect.left + rect.width / 2;
    const cy = e.clientY || rect.top + rect.height / 2;
    toggleMenuWithWater({
      x: cx / Math.max(window.innerWidth, 1),
      y: 1 - cy / Math.max(window.innerHeight, 1),
    });
  };

  const handleWordmarkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX || rect.left + rect.width / 2;
      const cy = e.clientY || rect.top + rect.height / 2;
      triggerWaterBurst(
        {
          x: cx / Math.max(window.innerWidth, 1),
          y: 1 - cy / Math.max(window.innerHeight, 1),
        },
        () => window.scrollTo({ top: 0, behavior: "smooth" }),
      );
    }
  };

  const leadLabel = ROUTE_LEADS[pathname] || "CH-01 // OVERVIEW";

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className={`top-bar life-monitor-bar ${hidden && !menuOpen ? "is-hidden" : ""}`}>
        <TransitionLink
          href="/"
          className="wordmark"
          aria-label={`${content.owner.shortName} — Return to Home`}
          onClick={handleWordmarkClick}
          onPointerEnter={() => setCursorMode("link")}
          onPointerLeave={() => setCursorMode("default")}
        >
          <span className={`wordmark-akash ${ecgBootDone ? "is-revealed" : ""}`}>
            <svg
              className="wordmark-ecg-trace"
              viewBox="0 0 144 34"
              aria-hidden="true"
            >
              {LETTER_PATHS.map((d, i) => {
                const segStart = i * 0.18;
                const segSpan = 0.28;
                const localP = Math.min(
                  Math.max((ecgBootProgress - segStart) / segSpan, 0),
                  1,
                );
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke="var(--c-bold)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: 1 - localP,
                      opacity: ecgBootDone ? 0 : 0.96,
                    }}
                  />
                );
              })}
            </svg>
            <span className="wordmark-text">{content.owner.shortName}</span>
          </span>
          <span className="wordmark-dot" aria-hidden="true">
            .
          </span>
        </TransitionLink>

        <div className="monitor-telemetry" aria-hidden="true">
          <span className="monitor-pulse-dot" />
          <span className="mono-label">72 BPM · SINUS</span>
          <span className="monitor-divider">|</span>
          <span className="mono-label monitor-lead-name">{leadLabel}</span>
        </div>

        <div className="top-actions">
          <button
            ref={magneticRef}
            type="button"
            className="menu-trigger monitor-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-menu-overlay"
            onClick={handleMenuClick}
            onPointerMove={handleMagneticMove}
            onPointerEnter={() => setCursorMode("link")}
            onPointerLeave={handleMagneticLeave}
          >
            <span className="monitor-btn-led" aria-hidden="true" />
            <span>{menuOpen ? "CLOSE MONITOR" : "MONITOR // MENU"}</span>
          </button>
        </div>
      </header>

      <NavOverlay />
    </>
  );
}
