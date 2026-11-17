"use client";

import React from "react";

interface SplitTextProps {
  text: string;
  italic?: boolean;
  className?: string;
}

export function SplitText({
  text,
  italic = false,
  className = "",
}: SplitTextProps) {
  const words = text.split(" ");

  return (
    <span className={`split-root ${italic ? "is-italic" : ""} ${className}`}>
      {words.map((word, wi) => (
        <span key={`${word}-${wi}`} className="split-word">
          {Array.from(word).map((ch, ci) => (
            <span
              key={`${ci}-${ch}`}
              className="split-char"
              style={{ ["--char-i" as string]: wi * 5 + ci }}
            >
              {ch}
            </span>
          ))}
          {wi < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
