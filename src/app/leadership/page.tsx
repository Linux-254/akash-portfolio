"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import content from "@/content.json";
import { Media, MediaVariant } from "@/components/Media";
import { TransitionLink } from "@/components/TransitionLink";
import { WriteReveal } from "@/components/WriteReveal";

gsap.registerPlugin(ScrollTrigger);

const ACH_VARIANTS: MediaVariant[] = ["diagonal", "duotone", "arch"];

export default function LeadershipPage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const statRef = useRef<HTMLSpanElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      if (statRef.current) {
        const counter = { val: 0 };
        gsap.to(counter, {
          val: 50,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: statRef.current, start: "top 80%", once: true },
          onUpdate: () => {
            if (statRef.current) statRef.current.textContent = `${Math.round(counter.val)}%`;
          },
        });
      }

      if (stageRef.current && trackRef.current && window.innerWidth >= 1025) {
        gsap.to(trackRef.current, {
          x: () => -(trackRef.current!.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: stageRef.current,
            pin: true,
            scrub: 0.8,
            end: () => `+=${Math.max(trackRef.current!.scrollWidth - window.innerWidth, 700)}`,
            invalidateOnRefresh: true,
          },
        });
      }
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  const { leadership } = content;

  return (
    <div ref={wrapRef} className="subpage-wrap">
      <section className="band subpage-hero">
        <div className="band-inner">
          <p className="mono-label">{leadership.kicker}</p>
          <h1 className="hero-headline" style={{ marginTop: "0.75rem" }}>
            {leadership.philosophyTitle}
          </h1>
          <WriteReveal
            text={leadership.philosophyText}
            className="lead-copy"
            style={{ marginTop: "1.4rem" }}
          />
        </div>
      </section>

      <section ref={stageRef} className="beats-stage">
        <div ref={trackRef} className="horizontal-track">
          {leadership.positions.map((pos, idx) => (
            <article key={pos.role} className="beat-panel">
              <div className="beat-panel-inner">
                <span className="beat-giant-num" aria-hidden="true">{pos.period}</span>
                <p className="mono-label">0{idx + 1} · {pos.org}</p>
                <h2 className="section-heading">{pos.role}</h2>
                <WriteReveal text={pos.focus} className="lead-copy" />
                <div style={{ width: "min(280px, 70vw)", marginTop: "1.5rem" }}>
                  <Media slot={`leadership-timeline-${idx + 1}`} variant="circle" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="band leadership-victory-band">
        <div className="band-inner">
          <p className="mono-label">Landmark Student Welfare Victory</p>
          <span ref={statRef} className="stat-giant">50%</span>
          <h2 className="section-heading">{leadership.achievements[0].title}</h2>
          <WriteReveal
            text={leadership.achievements[0].text}
            className="lead-copy"
            style={{ marginTop: "1.25rem" }}
          />
        </div>
      </section>

      <section className="band">
        <div className="band-inner">
          {leadership.achievements.map((ach, i) => (
            <div key={ach.index} className="teaser-grid" style={{ marginBottom: "5rem" }}>
              <div>
                <p className="mono-label">Achievement {ach.index} · {ach.stat}</p>
                <h3 className="section-heading">{ach.title}</h3>
                <WriteReveal text={ach.text} className="lead-copy" />
              </div>
              <Media slot={ach.slot} variant={ACH_VARIANTS[i % ACH_VARIANTS.length]} />
            </div>
          ))}
          <TransitionLink href="/initiatives" className="editorial-link">
            Next: Community Initiatives &amp; CBO →
          </TransitionLink>
        </div>
      </section>
    </div>
  );
}
