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
