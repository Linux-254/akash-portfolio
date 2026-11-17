"use client";

import React, { useEffect, useRef, useState } from "react";
import content from "@/content.json";
import { useApp } from "./AppContext";
import { TransitionLink } from "./TransitionLink";
import { Media } from "./Media";

const PREVIEW_SLOTS: Record<string, string> = {
  "/": "hero-portrait",
  "/about": "about-portrait",
  "/leadership": "leadership-hero",
  "/initiatives": "initiative-hero",
  "/contact": "social-posts-1",
};

export function NavOverlay() {
  const { menuOpen, toggleMenuWithWater } = useApp();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const firstLink = overlayRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleMenuWithWater({ x: 0.9, y: 0.92 });
        return;
      }
      if (e.key === "Tab" && overlayRef.current) {
        const focusables = Array.from(
          overlayRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, toggleMenuWithWater]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    if (dy > 64) toggleMenuWithWater({ x: 0.5, y: 0.25 });
    touchStartY.current = null;
  };

  const activeSlot = hoveredHref ? PREVIEW_SLOTS[hoveredHref] : null;

  return (
    <div
      id="site-menu-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Clinical Telemetry Navigation Monitor"
      className={`menu-overlay monitor-screen-overlay ${menuOpen ? "is-open" : ""}`}
      aria-hidden={!menuOpen}
      onPointerMove={(e) => setPreviewPos({ x: e.clientX, y: e.clientY })}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="monitor-grid-bg" aria-hidden="true" />
      <div className="menu-overlay-inner">
        <div className="menu-overlay-head monitor-head-strip">
          <div className="monitor-vitals-row">
            <span className="monitor-pulse-dot" aria-hidden="true" />
          </div>
          <button
            type="button"
            className="menu-close-btn monitor-menu-btn"
            onClick={(e) =>
              toggleMenuWithWater({
                x: e.clientX / Math.max(window.innerWidth, 1),
                y: 1 - e.clientY / Math.max(window.innerHeight, 1),
              })
            }
          >
            Standby [ESC]
          </button>
        </div>

        <nav className="menu-links" aria-label="Monitor channels">
          {content.nav.map((item, idx) => (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={`menu-link monitor-channel-link ${hoveredHref && hoveredHref !== item.href ? "is-dimmed" : ""}`}
              style={{ transitionDelay: menuOpen ? `${idx * 45}ms` : "0ms" }}
              onPointerEnter={() => setHoveredHref(item.href)}
              onPointerLeave={() => setHoveredHref(null)}
            >
              <span className="menu-index">CH-{item.index}</span>
              <span className="menu-label">{item.label}</span>
            </TransitionLink>
          ))}
        </nav>

        <div className="menu-footer monitor-footer-strip">
          <div className="menu-footer-col">
            <span className="mono-label">Attending &amp; Governance</span>
            <span>{content.owner.school}</span>
            <span>{content.owner.location}</span>
          </div>
          <div className="menu-footer-col">
            <span className="mono-label">Direct WhatsApp &amp; Mail</span>
            <a href={`mailto:${content.contact.email}`}>{content.contact.email}</a>
            <a
              href={`https://wa.me/${content.contact.phones[0].replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp {content.contact.phones[0]} ↗
            </a>
          </div>
          <div className="menu-footer-col">
            <span className="mono-label">Social Dispatch</span>
            <span>TikTok {content.contact.tiktok}</span>
            <span>Instagram {content.contact.instagram}</span>
          </div>
        </div>
      </div>

      {activeSlot && (
        <div
          className="menu-preview"
          style={{
            transform: `translate3d(${previewPos.x + 28}px, ${previewPos.y - 90}px, 0)`,
          }}
          aria-hidden="true"
        >
          <Media slot={activeSlot} variant="diagonal" />
        </div>
      )}
    </div>
  );
}
