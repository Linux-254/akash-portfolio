"use client";

import React, { useEffect, useRef, useState } from "react";
import content from "@/content.json";
import { MEDIA_SLOTS } from "@/media";
import { useApp } from "./AppContext";
import { Media } from "./Media";

type ReelItem = (typeof content.home.reels)[number];

const PHOTO_PLATES = [
  "Clinical Campus Walk",
  "Council Preparation",
  "Northern Kenya Horizon",
];

export function MobileReels() {
  const { triggerWaterBurst } = useApp();
  const [activeReel, setActiveReel] = useState<ReelItem | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [inViewIdx, setInViewIdx] = useState<number | null>(null);
  const [missingVideos, setMissingVideos] = useState<Record<string, boolean>>({});
  const [photoSlide, setPhotoSlide] = useState(0);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const previewVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const previewIframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    content.home.reels.forEach((reel) => {
      if (reel.isPhoto) return;
      const slot = MEDIA_SLOTS[reel.slot];
      if (!slot?.src) return;
      fetch(slot.src, { method: "HEAD" })
        .then((res) => {
          if (!res.ok) {
            setMissingVideos((prev) => ({ ...prev, [reel.slot]: true }));
          }
        })
        .catch(() => {
          setMissingVideos((prev) => ({ ...prev, [reel.slot]: true }));
        });
    });
  }, []);

  // Touch devices (no hover): autoplay muted preview when card sits in viewport center
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (!coarse) return;

    const onScroll = () => {
      const vh = window.innerHeight || 800;
      let bestIdx: number | null = null;
      let bestScore = Infinity;
      cardRefs.current.forEach((el, idx) => {
        if (!el || content.home.reels[idx]?.isPhoto) return;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const visibleRatio =
          Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0)) /
          Math.max(rect.height, 1);
        if (visibleRatio >= 0.55) {
          const dist = Math.abs(center - vh / 2);
          if (dist < bestScore) {
            bestScore = dist;
            bestIdx = idx;
          }
        }
      });
      setInViewIdx(bestIdx);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Play preloaded local videos & send TikTok player postMessage controls immediately on hover/view
  useEffect(() => {
    const activePreview = hoveredIdx ?? inViewIdx;
    previewVideoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === activePreview && !activeReel) {
        vid.muted = true;
        vid.play().catch(() => undefined);
      } else {
        vid.pause();
        if (vid.currentTime > 0) vid.currentTime = 0;
      }
    });

    previewIframeRefs.current.forEach((frame, idx) => {
      if (!frame?.contentWindow) return;
      try {
        if (idx === activePreview && !activeReel) {
          frame.contentWindow.postMessage(
            { type: "mute", "x-tiktok-player": true },
            "https://www.tiktok.com",
          );
          frame.contentWindow.postMessage(
            { type: "play", "x-tiktok-player": true },
            "https://www.tiktok.com",
          );
        } else {
          frame.contentWindow.postMessage(
            { type: "pause", "x-tiktok-player": true },
            "https://www.tiktok.com",
          );
        }
      } catch {
        // Cross-origin frame awaiting interaction
      }
    });
  }, [hoveredIdx, inViewIdx, activeReel]);

  useEffect(() => {
    if (!activeReel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveReel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (modalVideoRef.current) {
        modalVideoRef.current.pause();
      }
    };
  }, [activeReel]);

  const handleTimeLoopPreview = (idx: number) => {
    const vid = previewVideoRefs.current[idx];
    if (vid && vid.currentTime >= 6) {
      vid.currentTime = 0;
    }
  };

  const openReelWithPaint = (
    e: React.MouseEvent<HTMLElement>,
    reel: ReelItem,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX || rect.left + rect.width / 2;
    const cy = e.clientY || rect.top + rect.height / 2;
    setPhotoSlide(0);
    triggerWaterBurst(
      {
        x: cx / Math.max(window.innerWidth, 1),
        y: 1 - cy / Math.max(window.innerHeight, 1),
      },
      () => setActiveReel(reel),
    );
  };

  const activeSlot = activeReel ? MEDIA_SLOTS[activeReel.slot] : null;
  const activeUsesEmbed = Boolean(
    activeReel && !activeReel.isPhoto && missingVideos[activeReel.slot],
  );

  return (
    <section className="band reels-band" aria-label="Field & Campus Dispatches">
      <div className="band-inner">
        <div className="reels-header">
          <div>
            <p className="mono-label">Dispatches · @SG_AKASH TikTok Archive</p>
            <h2 className="section-heading">
              Scenes from the <em>wards &amp; halls.</em>
            </h2>
          </div>
          <p className="lead-copy">
            Previews are preloaded in frame—hover any video to play muted, or select to open with full audio in the clinical monitor. The photo essay remains strictly silent.
          </p>
        </div>

        <div className="phone-wall">
          {content.home.reels.map((reel, idx) => {
            const slotMeta = MEDIA_SLOTS[reel.slot];
            const isPreviewActive = (hoveredIdx === idx || inViewIdx === idx) && !activeReel;
            const localMissing = Boolean(missingVideos[reel.slot]);

            return (
              <div
                key={reel.slot}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                className={`phone-reel phone-offset-${idx}`}
                onMouseEnter={() => !reel.isPhoto && setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <button
                  type="button"
                  className="phone-card-trigger"
                  onClick={(e) => openReelWithPaint(e, reel)}
                  aria-label={
                    reel.isPhoto
                      ? `Open silent photo essay: ${reel.title}`
                      : `Play ${reel.title} with sound`
                  }
                >
                  <div className={`phone-screen ${isPreviewActive ? "is-preview-playing" : ""}`}>
                    {!reel.isPhoto && slotMeta?.src && !localMissing ? (
                      <video
                        ref={(el) => {
                          previewVideoRefs.current[idx] = el;
                        }}
                        src={slotMeta.src}
                        poster={slotMeta.poster}
                        width={slotMeta.w}
                        height={slotMeta.h}
                        preload="auto"
                        muted
                        playsInline
                        loop
                        onTimeUpdate={() => handleTimeLoopPreview(idx)}
                        onError={() =>
                          setMissingVideos((prev) => ({ ...prev, [reel.slot]: true }))
                        }
                        className="media-el"
                      />
                    ) : !reel.isPhoto && reel.tiktokId ? (
                      <>
                        {/* Pre-mounted muted TikTok player ready before hover */}
                        <iframe
                          ref={(el) => {
                            previewIframeRefs.current[idx] = el;
                          }}
                          src={`https://www.tiktok.com/player/v1/${reel.tiktokId}?muted=1&autoplay=0&controls=0&loop=1`}
                          title={`${reel.title} preloaded player`}
                          allow="autoplay"
                          loading="eager"
                          className="phone-embed-frame"
                        />
                        <div className={`phone-poster-cover ${isPreviewActive ? "is-hidden" : ""}`}>
                          <Media slot={reel.slot} variant="plain" caption={reel.title} />
                        </div>
                      </>
                    ) : (
                      <Media slot={reel.slot} variant="plain" caption={reel.title} />
                    )}

                    <span className="phone-notch" aria-hidden="true" />
                    <span className="phone-play-pill" aria-hidden="true">
                      {reel.isPhoto ? `STILL · ${reel.index}` : `▶ ${reel.index}`}
                    </span>
                  </div>

                  <div className="phone-meta">
                    <span className="mono-label">{reel.context}</span>
                    <strong className="phone-title">{reel.title}</strong>
                  </div>
                </button>

                <a
                  href={reel.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tiktok-out-link"
                >
                  Open on TikTok ↗
                </a>
              </div>
            );
          })}
        </div>
      </div>

      {activeReel && (
        <div
          className="hologram-modal"
          role="dialog"
          aria-modal="true"
          aria-label={activeReel.title}
          onClick={() => setActiveReel(null)}
        >
          <div
            className="hologram-viewport"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="holo-reticle" aria-hidden="true" />
            <div className="holo-scanline" aria-hidden="true" />

            <div className="holo-header">
              <span className="mono-label">
                {activeReel.isPhoto ? "SILENT PHOTO SERIES" : "AUDIO VIDEO FEED"} · {activeReel.index} · {activeReel.context}
              </span>
              <button
                type="button"
                className="menu-close-btn"
                onClick={() => setActiveReel(null)}
              >
                Close [ESC]
              </button>
            </div>

            <div className="holo-body">
              <div className="holo-frame">
                {activeReel.isPhoto ? (
                  <div className="photo-carousel" aria-label="Silent photo post carousel">
                    <Media
                      slot={activeReel.slot}
                      variant="plain"
                      caption={`${PHOTO_PLATES[photoSlide]} (${photoSlide + 1}/${PHOTO_PLATES.length})`}
                    />
                    <div className="photo-carousel-bar">
                      <button
                        type="button"
                        className="carousel-step-btn"
                        onClick={() =>
                          setPhotoSlide((s) => (s - 1 + PHOTO_PLATES.length) % PHOTO_PLATES.length)
                        }
                      >
                        Prev
                      </button>
                      <span className="mono-label">
                        0{photoSlide + 1} / 0{PHOTO_PLATES.length} · Silent
                      </span>
                      <button
                        type="button"
                        className="carousel-step-btn"
                        onClick={() => setPhotoSlide((s) => (s + 1) % PHOTO_PLATES.length)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : !activeUsesEmbed && activeSlot?.src ? (
                  <video
                    ref={modalVideoRef}
                    src={activeSlot.src}
                    poster={activeSlot.poster}
                    width={activeSlot.w}
                    height={activeSlot.h}
                    controls
                    autoPlay
                    playsInline
                    onError={() =>
                      setMissingVideos((prev) => ({ ...prev, [activeReel.slot]: true }))
                    }
                    className="media-el"
                  />
                ) : (
                  <iframe
                    src={`https://www.tiktok.com/player/v1/${activeReel.tiktokId}?autoplay=1&muted=0&controls=1`}
                    title={activeReel.title}
                    allow="autoplay; fullscreen"
                    className="holo-embed-frame"
                  />
                )}
              </div>

              <div className="holo-telemetry">
                <h3 className="section-heading">{activeReel.title}</h3>
                <p className="lead-copy">{activeReel.summary}</p>
                <div className="holo-controls">
                  <a
                    href={activeReel.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hold-cta"
                  >
                    <span className="hold-cta-text">Open on TikTok ↗</span>
                  </a>
                  <span className="mono-label">
                    {activeReel.isPhoto
                      ? "STILL PHOTOGRAPH · ZERO AUDIO"
                      : "SOUND ENABLED · 9:16"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
