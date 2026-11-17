"use client";

import content from "@/content.json";
import { Media, MediaVariant } from "@/components/Media";
import { TransitionLink } from "@/components/TransitionLink";
import { WriteReveal } from "@/components/WriteReveal";

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
  const { initiatives } = content;

  return (
    <div className="subpage-wrap meridian-bg">
      <section className="band subpage-hero">
        <div className="band-inner">
          <p className="mono-label">{initiatives.kicker}</p>
          <h1 className="hero-headline" style={{ marginTop: "0.75rem" }}>
            {initiatives.title}
          </h1>
          <WriteReveal
            text={initiatives.text}
            className="lead-copy"
            style={{ marginTop: "1.4rem" }}
          />

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

      <section className="band">
        <div className="band-inner">
          <div className="impact-word-mask" aria-label="IMPACT">
            <span>IMPACT</span>
          </div>
          <div className="pillars-grid">
            {initiatives.pillars.map((p) => (
              <article key={p.index} className="pillar-item">
                <span className="mono-label">{p.index}</span>
                <h2 className="section-heading" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}>
                  {p.title}
                </h2>
                <WriteReveal text={p.detail} className="lead-copy" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
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
