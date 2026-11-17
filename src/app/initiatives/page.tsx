"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import content from "@/content.json";
import { Media, MediaVariant } from "@/components/Media";
import { TransitionLink } from "@/components/TransitionLink";
import { WriteReveal } from "@/components/WriteReveal";

gsap.registerPlugin(ScrollTrigger);

const GALLERY_VARIANTS: MediaVariant[] = [
  "arch",
  "diagonal",
  "circle",
  "duotone",
  "mask-fade",
  "plain",
  "diagonal",
  "arch",
];

export default function InitiativesPage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { initiatives } = content;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(".proof-item", {
        y: 26,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ".proof-strip", start: "top 94%", once: true },
      });

      gsap.fromTo(
        ".impact-word-mask span",
        { yPercent: 22, opacity: 0.35, scale: 0.94 },
        {
          yPercent: 0,
          opacity: 1,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".impact-word-mask",
            start: "top 90%",
            end: "top 40%",
            scrub: 0.8,
          },
        },
      );

      gsap.from(".pillar-item", {
        y: 34,
        opacity: 0,
        duration: 0.8,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: { trigger: ".pillars-grid", start: "top 84%", once: true },
      });

      gsap.utils.toArray<HTMLElement>(".stagger-cell").forEach((cell, i) => {
        gsap.from(cell, {
          y: i % 2 === 0 ? 44 : 26,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: cell, start: "top 88%", once: true },
        });
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapRef} className="subpage-wrap meridian-bg">
      <section className="band subpage-hero" data-avatar-mood="compassionate">
        <div className="band-inner">
          <div className="hero-grid" style={{ alignItems: "center" }}>
            <div className="hero-text-col">
              <p className="mono-label">{initiatives.kicker}</p>
              <WriteReveal
                as="h1"
                text={initiatives.title}
                className="hero-headline"
                style={{ marginTop: "0.75rem" }}
                autoReveal
              />
              <WriteReveal
                text={initiatives.text}
                className="lead-copy"
                style={{ marginTop: "1.4rem" }}
                autoReveal
              />
            </div>
            <div className="hero-portrait-wrap">
              <Media slot="initiative-hero" variant="diagonal" priority />
            </div>
          </div>

          <div className="proof-strip">
            {initiatives.stats.map((s) => (
              <div key={s.label} className="proof-item">
                <span className="mono-label">{s.label}</span>
                <strong className="proof-value">{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band" data-avatar-mood="compassionate">
        <div className="band-inner">
          <div className="impact-word-mask" aria-label="IMPACT">
            <span>IMPACT</span>
          </div>
          <div className="pillars-grid">
            {initiatives.pillars.map((p) => (
              <article key={p.index} className="pillar-item" data-avatar-mood="serious-reading">
                <span className="mono-label">{p.index}</span>
                <WriteReveal
                  as="h2"
                  text={p.title}
                  className="section-heading"
                  style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
                />
                <WriteReveal text={p.detail} className="lead-copy" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band" data-avatar-mood="compassionate">
        <div className="band-inner">
          <p className="mono-label">Field Documentation · Northern Kenya &amp; Beyond</p>
          <div className="stagger-gallery">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`stagger-cell cell-${i % 4}`}>
                <Media
                  slot={`initiative-gallery-${i + 1}`}
                  variant={GALLERY_VARIANTS[i]}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: "4rem" }}>
            <TransitionLink href="/contact" className="editorial-link">
              Partner with the CBO →
            </TransitionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
