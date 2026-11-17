"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import content from "@/content.json";
import { Media, MediaVariant } from "@/components/Media";
import { TransitionLink } from "@/components/TransitionLink";
import { WriteReveal } from "@/components/WriteReveal";

gsap.registerPlugin(ScrollTrigger);

const ACH_VARIANTS: MediaVariant[] = ["arch", "diagonal", "duotone", "plain"];

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
          scrollTrigger: { trigger: statRef.current, start: "top 85%", once: true },
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
            scrub: 0.85,
            end: () => `+=${Math.max(trackRef.current!.scrollWidth - window.innerWidth, 700)}`,
            invalidateOnRefresh: true,
          },
        });
      } else {
        gsap.utils.toArray<HTMLElement>(".beat-panel").forEach((panel) => {
          gsap.from(panel, {
            y: 34,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: panel, start: "top 86%", once: true },
          });
        });
      }

      gsap.utils.toArray<HTMLElement>(".achievement-row").forEach((row) => {
        gsap.from(row, {
          y: 38,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: row,
            start: "top 85%",
            once: true,
          },
        });
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  const { leadership } = content;

  return (
    <div ref={wrapRef} className="subpage-wrap">
      <section className="band subpage-hero" data-avatar-mood="proud-resolve">
        <div className="band-inner hero-grid" style={{ alignItems: "center" }}>
          <div className="hero-text-col">
            <p className="mono-label">{leadership.kicker}</p>
            <WriteReveal
              as="h1"
              text={leadership.philosophyTitle}
              className="hero-headline"
              style={{ marginTop: "0.75rem" }}
              autoReveal
            />
            <WriteReveal
              text={leadership.philosophyText}
              className="lead-copy"
              style={{ marginTop: "1.4rem" }}
              autoReveal
            />
          </div>
          <div className="hero-portrait-wrap">
            <Media slot="leadership-hero" variant="diagonal" priority loading="eager" />
          </div>
        </div>
      </section>

      <section ref={stageRef} className="beats-stage" data-avatar-mood="serious-reading">
        <div ref={trackRef} className="horizontal-track">
          {leadership.positions.map((pos, idx) => (
            <article key={pos.role} className="beat-panel">
              <div className="beat-panel-inner">
                <span className="beat-giant-num" aria-hidden="true">{pos.period}</span>
                <p className="mono-label">0{idx + 1} · {pos.org}</p>
                <WriteReveal as="h2" text={pos.role} className="section-heading" />
                <WriteReveal text={pos.focus} className="lead-copy" />
                <div style={{ width: "min(280px, 70vw)", marginTop: "1.5rem" }}>
                  <Media
                    slot={`leadership-timeline-${idx + 1}`}
                    variant="circle"
                    className="timeline-thumb-frame"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="band leadership-victory-band" data-avatar-mood="proud-resolve">
        <div className="band-inner">
          <p className="mono-label">Landmark Student Welfare Victory</p>
          <span ref={statRef} className="stat-giant">50%</span>
          <WriteReveal
            as="h2"
            text={leadership.achievements[0].title}
            className="section-heading"
          />
          <WriteReveal
            text={leadership.achievements[0].text}
            className="lead-copy"
            style={{ marginTop: "1.25rem" }}
          />
        </div>
      </section>

      <section className="band" data-avatar-mood="proud-resolve">
        <div className="band-inner">
          {leadership.achievements.map((ach, i) => {
            const isProofCard = ach.slot === "leadership-achievement-4";
            const isReversed = i === 1;
            return (
              <article
                key={ach.index}
                className={`achievement-row achievement-row-${i + 1} ${isReversed ? "is-reversed" : ""}`}
                data-avatar-mood={isProofCard ? "serious-reading" : "proud-resolve"}
              >
                <div className="achievement-copy">
                  <p className="mono-label">Achievement {ach.index} · {ach.stat}</p>
                  <WriteReveal as="h2" text={ach.title} className="section-heading" />
                  <WriteReveal text={ach.text} className="lead-copy" />
                </div>

                <div className={isProofCard ? "achievement-proof-wrap" : "achievement-media-wrap"}>
                  <Media
                    slot={ach.slot}
                    variant={ACH_VARIANTS[i % ACH_VARIANTS.length]}
                  />
                </div>
              </article>
            );
          })}

          <TransitionLink href="/initiatives" className="editorial-link">
            Next: Community Initiatives &amp; CBO →
          </TransitionLink>
        </div>
      </section>
    </div>
  );
}
