"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface MarqueeProps {
  words: string[];
}

export function Marquee({ words }: MarqueeProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let offset = 0;
    let velocityBoost = 0;

    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        velocityBoost = Math.min(Math.abs(self.getVelocity()) * 0.0022, 6);
      },
    });

    const tick = (_time: number, delta: number) => {
      const dt = Math.min(delta / 1000, 0.05);
      velocityBoost *= Math.exp(-5 * dt);
      offset -= (4.2 + velocityBoost * 5) * dt;
      if (offset <= -50) offset += 50;
      track.style.transform = `translate3d(${offset}%, 0, 0)`;
    };

    gsap.ticker.add(tick);
    return () => {
      st.kill();
      gsap.ticker.remove(tick);
    };
  }, []);

  const line = [...words, ...words, ...words, ...words];

  return (
    <div className="marquee-band" aria-label={words.join(", ")}>
      <div ref={trackRef} className="marquee-track">
        {line.map((w, idx) => (
          <span key={`${w}-${idx}`} className="marquee-item">
            <span className={idx % 2 === 1 ? "is-italic" : ""}>{w}</span>
            <span className="marquee-sep" aria-hidden="true">
              ·
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
