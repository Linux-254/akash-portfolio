"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useApp } from "./AppContext";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll() {
  const { engineRef } = useApp();
  const pathname = usePathname();

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

    lenis.on("scroll", ({ progress }: { progress: number }) => {
      ScrollTrigger.update();
      engineRef.current?.setScrollProgress(progress * 2);
    });

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [engineRef]);

  useEffect(() => {
    engineRef.current?.setScrollProgress(0);
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, engineRef]);

  return null;
}
