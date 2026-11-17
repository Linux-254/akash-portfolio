"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MEDIA_SLOTS } from "@/media";
import { useApp } from "./AppContext";

export type MediaVariant =
  | "plain"
  | "arch"
  | "strip"
  | "circle"
  | "diagonal"
  | "duotone"
  | "mask-fade"
  | "hero-monolith";

interface MediaProps {
  slot: string;
  variant?: MediaVariant;
  className?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  caption?: string;
}

export function Media({
  slot,
  variant = "plain",
  className = "",
  priority = false,
  loading,
  caption,
}: MediaProps) {
  const { setCursorMode } = useApp();
  const item = MEDIA_SLOTS[slot];
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [slot, item?.src]);

  if (!item) return null;

  const isPriority =
    priority ||
    slot === "hero-portrait" ||
    slot === "leadership-hero" ||
    slot === "initiative-hero";
  const ratioStyle = { aspectRatio: `${item.w} / ${item.h}` };
  const uid = item.id.replace(/[^a-z0-9]/gi, "");
  const sizesAttr =
    item.sizes || "(max-width: 599px) 94vw, (max-width: 1024px) 48vw, 680px";
  const showAsset = Boolean(item.src) && !imgFailed;
  const showPosterImage = !showAsset && Boolean(item.poster) && !imgFailed;

  return (
    <div
      className={`media-frame media-${variant} ${className}`}
      style={ratioStyle}
      data-cursor="media"
      onPointerEnter={() => setCursorMode("media")}
      onPointerLeave={() => setCursorMode("default")}
    >
      {showAsset && item.src ? (
        item.kind === "video" ? (
          <video
            src={item.src}
            poster={item.poster}
            width={item.w}
            height={item.h}
            preload="none"
            muted
            playsInline
            loop
            aria-label={item.alt}
            onError={() => setImgFailed(true)}
            className="media-el"
          />
        ) : (
          <Image
            src={item.src}
            alt={item.alt}
            width={item.w}
            height={item.h}
            sizes={sizesAttr}
            priority={isPriority}
            loading={loading || (isPriority ? "eager" : "lazy")}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="media-el"
            style={{
              objectPosition: item.focus || "50% 50%",
              objectFit: item.fit || "cover",
            }}
          />
        )
      ) : showPosterImage && item.poster ? (
        <Image
          src={item.poster}
          alt={item.alt}
          width={item.w}
          height={item.h}
          sizes={sizesAttr}
          priority={isPriority}
          loading={loading || (isPriority ? "eager" : "lazy")}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="media-el"
          style={{
            objectPosition: item.focus || "50% 25%",
            objectFit: item.fit || "cover",
          }}
        />
      ) : (
        <svg
          viewBox="0 0 400 500"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={item.alt}
          className="media-svg"
        >
          <defs>
            <radialGradient id={`wash-${uid}`} cx="38%" cy="32%" r="78%">
              <stop offset="0%" stopColor="var(--c-bold)" stopOpacity="0.34" />
              <stop offset="52%" stopColor="var(--c-bold-soft)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--c-neutral-light)" stopOpacity="0.15" />
            </radialGradient>
            <linearGradient id={`veil-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--c-neutral-dark)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--c-neutral-dark)" stopOpacity="0.22" />
            </linearGradient>
          </defs>
          <rect width="400" height="500" fill={`url(#wash-${uid})`} />
          <rect width="400" height="500" fill={`url(#veil-${uid})`} />
          <path
            d="M-20 310 Q 90 250, 175 310 T 420 290"
            fill="none"
            stroke="var(--c-bold)"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
          <path
            d="M-20 336 Q 110 278, 210 332 T 420 316"
            fill="none"
            stroke="var(--c-neutral-dark)"
            strokeOpacity="0.14"
            strokeWidth="0.9"
          />
          <circle
            cx="200"
            cy="220"
            r="96"
            fill="none"
            stroke="var(--c-bold)"
            strokeOpacity="0.2"
            strokeDasharray="3 7"
            strokeWidth="1"
          />
        </svg>
      )}

      {!showAsset && !showPosterImage && (
        <span className="media-caption-corner">
          {caption || item.alt}
        </span>
      )}
    </div>
  );
}
