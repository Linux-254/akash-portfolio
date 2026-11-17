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
      <section className="band subpage-hero">
        <div className="band-inner">
          <p className="mono-label">{about.kicker}</p>
          <h1 className="hero-headline" style={{ marginTop: "0.75rem" }}>
            {about.title}
          </h1>
          <WriteReveal text={about.lead} className="lead-copy" style={{ marginTop: "1.4rem" }} />
        </div>
      </section>

      <section className="band">
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
              <article key={ch.index} className="story-chapter">
                <span className="mono-label">{ch.index}</span>
                <h2 className="section-heading">{ch.heading}</h2>
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
            </div>

            <TransitionLink href="/leadership" className="editorial-link">
              Next: Leadership &amp; Impact →
            </TransitionLink>
          </div>
        </div>
      </section>
    </div>
  );
}
