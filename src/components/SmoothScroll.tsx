"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useApp } from "./AppContext";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll() {
  const { engineRef } = useApp();
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const onScroll = () => {
        const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        engineRef.current?.setScrollProgress((window.scrollY / max) * 2);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ({ progress }: { progress: number }) => {
      ScrollTrigger.update();
      engineRef.current?.setScrollProgress(progress * 2);
    });

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Refresh ScrollTrigger once webfonts finish loading so pin spacers & text heights match
    document.fonts?.ready.then(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    });

    return () => {
      lenisRef.current = null;
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [engineRef]);

  useEffect(() => {
    engineRef.current?.setScrollProgress(0);
    lenisRef.current?.scrollTo(0, { immediate: true });

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        lenisRef.current?.resize();
        ScrollTrigger.refresh();
      });
    });

    // Secondary refresh after async images/layout settle
    const settleTimer = window.setTimeout(() => {
      lenisRef.current?.resize();
      ScrollTrigger.refresh();
    }, 320);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(settleTimer);
    };
  }, [pathname, engineRef]);

  return null;
}
