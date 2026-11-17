"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import content from "@/content.json";
import { Media } from "@/components/Media";
import { TransitionLink } from "@/components/TransitionLink";
import { WriteReveal } from "@/components/WriteReveal";

gsap.registerPlugin(ScrollTrigger);

export default function AboutPage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.innerWidth < 600 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".candid-tilt").forEach((card) => {
        gsap.to(card, {
          rotation: 0,
          y: 0,
          ease: "none",
          scrollTrigger: { trigger: card, start: "top 85%", end: "top 35%", scrub: true },
        });
      });
    }, wrapRef);
    return () => ctx.revert();
  }, []);

  const { about } = content;

  return (
    <div ref={wrapRef} className="subpage-wrap">
      <section className="band subpage-hero" data-avatar-mood="serious-reading">
        <div className="band-inner">
          <p className="mono-label">{about.kicker}</p>
          <WriteReveal
            as="h1"
            text={about.title}
            className="hero-headline"
            style={{ marginTop: "0.75rem" }}
            autoReveal
          />
          <WriteReveal
            text={about.lead}
            className="lead-copy"
            style={{ marginTop: "1.4rem" }}
            autoReveal
          />
        </div>
      </section>

      <section className="band" data-avatar-mood="serious-reading">
        <div className="band-inner about-split">
          <div className="about-sticky-col">
            <Media slot="about-portrait" variant="arch" />
          </div>

          <div className="about-story-col">
            <WriteReveal
              as="blockquote"
              className="pull-quote"
              text="“Reaching the university gate is never the finish line—it is the obligation to hold that door open.”"
            />
            <WriteReveal text={about.bio} className="lead-copy" />

            {about.chapters.map((ch) => (
              <article key={ch.index} className="story-chapter" data-avatar-mood="serious-reading">
                <span className="mono-label">{ch.index}</span>
                <WriteReveal as="h2" text={ch.heading} className="section-heading" />
                <WriteReveal text={ch.text} className="lead-copy" />
              </article>
            ))}

            <div className="candid-cluster">
              <div className="candid-tilt tilt-left">
                <Media slot="about-candid-1" variant="duotone" />
              </div>
              <div className="candid-tilt tilt-right">
                <Media slot="about-candid-2" variant="diagonal" />
              </div>
              <div className="candid-tilt tilt-slight">
                <Media slot="about-candid-3" variant="circle" />
              </div>
              <div className="candid-tilt tilt-fourth">
                <Media slot="about-candid-4" variant="mask-fade" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {about.brother && (
        <section className="band brother-tribute-band" data-avatar-mood="proud-resolve">
          <div className="band-inner">
            <article className="story-chapter brother-story-chapter">
              <div className="brother-grid">
                <div className="brother-copy-col">
                  <span className="mono-label">{about.brother.kicker}</span>
                  <WriteReveal
                    as="h2"
                    text={about.brother.heading}
                    className="section-heading"
                    style={{ marginTop: "0.5rem" }}
                  />
                  <blockquote
                    className="pull-quote"
                    style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}
                  >
                    {about.brother.quote}
                  </blockquote>
                  <WriteReveal text={about.brother.text} className="lead-copy" />

                  <div style={{ marginTop: "2rem" }}>
                    <TransitionLink href="/leadership" className="editorial-link">
                      Next: Leadership &amp; Impact →
                    </TransitionLink>
                  </div>
                </div>

                <div className="brother-photo-col">
                  <div className="brother-photo-frame">
                    <Media
                      slot={about.brother.mediaSlot}
                      variant="diagonal"
                      caption="Abdikhaliq's brother — lifelong anchor & Northern Kenya foundation"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
