"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import content from "@/content.json";
import { useApp } from "./AppContext";
import { TransitionLink } from "./TransitionLink";
import { NavOverlay } from "./NavOverlay";

const ROUTE_LEADS: Record<string, string> = {
  "/": "01 · Medicine & Service",
  "/about": "02 · Northern Kenya to Nairobi",
  "/leadership": "03 · UNSA & AMSUN Advocacy",
  "/initiatives": "04 · Community Mentorship",
  "/contact": "05 · Direct Inquiries",
};

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

  const leadLabel = ROUTE_LEADS[pathname] || "01 · Medicine & Service";
  const strokeP = ecgBootDone ? 1 : Math.min(ecgBootProgress / 0.82, 1);
  const fillOpacity = ecgBootDone ? 1 : Math.min(Math.max((ecgBootProgress - 0.62) / 0.36, 0), 1);
  const strokeOpacity = ecgBootDone ? 0 : 1 - Math.max((ecgBootProgress - 0.78) / 0.22, 0);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className={`top-bar ${hidden && !menuOpen ? "is-hidden" : ""}`}>
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
              viewBox="0 0 124 34"
              aria-hidden="true"
            >
              <path
                d="M 0 26 L 10 26 L 13 21 L 16 29 L 19 10 L 22 30 L 25 26 L 122 26"
                fill="none"
                stroke="var(--c-bold)"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: 1 - strokeP,
                  opacity: strokeOpacity * 0.75,
                }}
              />
              <text
                x="62"
                y="24"
                textAnchor="middle"
                className="wordmark-svg-stroke"
                style={{
                  strokeDasharray: 180,
                  strokeDashoffset: 180 * (1 - strokeP),
                  opacity: strokeOpacity,
                }}
              >
                {content.owner.shortName}
              </text>
            </svg>
            <span
              className="wordmark-text"
              style={{ opacity: fillOpacity }}
            >
              {content.owner.shortName}
            </span>
          </span>
          <span className="wordmark-dot" aria-hidden="true">
            .
          </span>
        </TransitionLink>

        <div className="monitor-telemetry" aria-hidden="true">
          <span className="monitor-pulse-dot" />
          <span className="mono-label monitor-chapter-label">{leadLabel}</span>
        </div>

        <div className="top-actions">
          <button
            ref={magneticRef}
            type="button"
            className="menu-trigger"
            aria-expanded={menuOpen}
            aria-controls="site-menu-overlay"
            onClick={handleMenuClick}
            onPointerMove={handleMagneticMove}
            onPointerEnter={() => setCursorMode("link")}
            onPointerLeave={handleMagneticLeave}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      <NavOverlay />
    </>
  );
}
