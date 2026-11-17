"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import content from "@/content.json";
import { Media } from "@/components/Media";
import { Marquee } from "@/components/Marquee";
import { TransitionLink } from "@/components/TransitionLink";
import { MobileReels } from "@/components/MobileReels";
import { WriteReveal } from "@/components/WriteReveal";
import { useApp } from "@/components/AppContext";

gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const { engineRef } = useApp();
  const [holdProgress, setHoldProgress] = useState(0);
  const [lockedNorth, setLockedNorth] = useState(false);
  const holdTimerRef = useRef<number>(0);

  useEffect(() => {
    const el = canvasWrapRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        "--wash-shift": 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".beats-stage",
          start: "top 75%",
          end: "bottom 25%",
          scrub: true,
        },
      });

      if (stage && track && window.innerWidth >= 1025) {
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            pin: true,
            scrub: 0.8,
            end: () => `+=${Math.max(track.scrollWidth - window.innerWidth, 800)}`,
            invalidateOnRefresh: true,
          },
        });
      }
    }, canvasWrapRef);

    return () => ctx.revert();
  }, []);

  const startHold = () => {
    setLockedNorth(false);
    const started = performance.now();
    const duration = 680;
    const step = () => {
      const p = Math.min((performance.now() - started) / duration, 1);
      setHoldProgress(p);
      engineRef.current?.setHoldAmount(p);
      if (p < 1) {
        holdTimerRef.current = requestAnimationFrame(step);
      } else {
        setLockedNorth(true);
        engineRef.current?.triggerLockNorth();
      }
    };
    holdTimerRef.current = requestAnimationFrame(step);
  };

  const endHold = () => {
    cancelAnimationFrame(holdTimerRef.current);
    if (!lockedNorth) {
      setLockedNorth(true);
      setHoldProgress(1);
      engineRef.current?.triggerLockNorth();
      document.getElementById("story-beats")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const { home } = content;

  return (
    <div ref={canvasWrapRef} className="home-canvas">
      <section className="band hero-band" data-avatar-mood="welcome">
        <div className="band-inner">
          <div className="hero-grid">
            <div className="hero-text-col">
              <div className="hero-super-caption">
                Abdikhaliq Akash
                <em>Medicine, Advocacy, Community &amp; Service</em>
              </div>
              <WriteReveal
                as="h1"
                text={home.headlineBefore}
                italicSuffix={home.headlineItalic}
                className="hero-headline"
                autoReveal
              />
              <WriteReveal
                text={home.subline}
                className="lead-copy"
                style={{ marginTop: "1.4rem" }}
                autoReveal
              />
              <div className="hero-cta-group">
                <button
                  type="button"
                  className={`hold-cta ${lockedNorth ? "is-locked" : ""}`}
                  onPointerDown={startHold}
                  onPointerUp={endHold}
                  onPointerLeave={() => cancelAnimationFrame(holdTimerRef.current)}
                >
                  <span
                    className="hold-cta-fill"
                    style={{ transform: `scaleX(${holdProgress})` }}
                    aria-hidden="true"
                  />
                  <span className="hold-cta-text">
                    {lockedNorth ? "Heartbeat synced" : home.ctaLabel}
                  </span>
                </button>
                <TransitionLink href="/leadership" className="editorial-link">
                  {home.secondaryCtaLabel} →
                </TransitionLink>
              </div>
            </div>

            <div className="hero-portrait-wrap">
              <Media slot="hero-portrait" variant="hero-monolith" priority />
            </div>
          </div>

          <div className="proof-strip" aria-label="Verified leadership and community record">
            {home.proofStrip.map((item) => (
              <div key={item.label} className="proof-item">
                <span className="mono-label">{item.label}</span>
                <strong className="proof-value">{item.value}</strong>
                <WriteReveal text={item.detail} className="proof-desc" autoReveal />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="story-beats" ref={stageRef} className="beats-stage">
        <div ref={trackRef} className="horizontal-track">
          {home.beats.map((beat, idx) => (
            <article
              key={beat.id}
              className={`beat-panel beat-panel-${idx}`}
              data-avatar-mood={idx === 2 ? "proud-resolve" : idx >= 3 ? "compassionate" : "serious-reading"}
            >
              <div className="beat-panel-inner">
                <span className="beat-giant-num" aria-hidden="true">
                  0{idx + 1}
                </span>
                <p className="mono-label">
                  {beat.index} · {beat.eyebrow}
                </p>
                <WriteReveal as="h2" text={beat.title} className="section-heading" />
                <WriteReveal text={beat.body} className="lead-copy" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <Marquee words={home.marqueeWords} />

      <section className="band teaser-leadership" data-avatar-mood="proud-resolve">
        <div className="band-inner teaser-grid">
          <div>
            <p className="mono-label">
              {home.leadershipTeaser.index} · {home.leadershipTeaser.kicker}
            </p>
            <WriteReveal as="h2" text={home.leadershipTeaser.title} className="section-heading" />
            <span className="stat-giant">{home.leadershipTeaser.stat}</span>
            <WriteReveal text={home.leadershipTeaser.statLabel} className="lead-copy" />
            <TransitionLink
              href={home.leadershipTeaser.href}
              className="editorial-link"
            >
              {home.leadershipTeaser.linkLabel} →
            </TransitionLink>
          </div>
          <Media slot="leadership-hero" variant="duotone" />
        </div>
      </section>

      <section className="band teaser-initiatives" data-avatar-mood="compassionate">
        <div className="band-inner teaser-grid">
          <Media slot="initiative-hero" variant="diagonal" />
          <div>
            <p className="mono-label">
              {home.initiativesTeaser.index} · {home.initiativesTeaser.kicker}
            </p>
            <WriteReveal as="h2" text={home.initiativesTeaser.title} className="section-heading" />
            <WriteReveal text={home.initiativesTeaser.body} className="lead-copy" />
            <TransitionLink
              href={home.initiativesTeaser.href}
              className="editorial-link"
            >
              {home.initiativesTeaser.linkLabel} →
            </TransitionLink>
          </div>
        </div>
      </section>

      <MobileReels />
    </div>
  );
}
