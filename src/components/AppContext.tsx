"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Engine } from "@/engine/Engine";
import { applyThemeToRoot, DEFAULT_THEME } from "@/theme.config";

export type CursorMode = "default" | "media" | "link" | "hold";

export interface OriginPoint {
  x: number;
  y: number;
}

type RouteTransitionHandler = (href: string, origin?: OriginPoint) => void;
type EffectTransitionHandler = (origin?: OriginPoint, onPeak?: () => void) => void;

interface AppContextValue {
  engineRef: React.MutableRefObject<Engine | null>;
  soundMuted: boolean;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMenuWithWater: (origin?: OriginPoint) => void;
  introDone: boolean;
  completeIntro: () => void;
  ecgBootProgress: number;
  ecgBootDone: boolean;
  cursorMode: CursorMode;
  setCursorMode: (mode: CursorMode) => void;
  isTransitioning: boolean;
  setIsTransitioning: (v: boolean) => void;
  registerTransition: (fn: RouteTransitionHandler) => void;
  registerWaterEffect: (fn: EffectTransitionHandler) => void;
  triggerWaterBurst: (origin?: OriginPoint, onPeak?: () => void) => void;
  navigateTo: (href: string, origin?: OriginPoint) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<Engine | null>(null);
  const transitionFnRef = useRef<RouteTransitionHandler | null>(null);
  const waterEffectFnRef = useRef<EffectTransitionHandler | null>(null);

  // Sound is always enabled aside from user-triggered video playback rules
  const soundMuted = false;
  const [menuOpen, setMenuOpen] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [ecgBootProgress, setEcgBootProgress] = useState(0);
  const [ecgBootDone, setEcgBootDone] = useState(false);
  const [cursorMode, setCursorMode] = useState<CursorMode>("default");
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    applyThemeToRoot(DEFAULT_THEME);
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("akash-intro-seen") === "1") {
        setIntroDone(true);
      }
    } catch {
      // sessionStorage unavailable
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEcgBootProgress(1);
      setEcgBootDone(true);
      return;
    }

    // Shared initial ECG boot sweep syncing center lifeline watermark and header AKASH SVG draw
    const duration = 1550;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setEcgBootProgress(t);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setEcgBootDone(true);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const completeIntro = useCallback(() => {
    setIntroDone(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("akash-intro-seen", "1");
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const registerTransition = useCallback((fn: RouteTransitionHandler) => {
    transitionFnRef.current = fn;
  }, []);

  const registerWaterEffect = useCallback((fn: EffectTransitionHandler) => {
    waterEffectFnRef.current = fn;
  }, []);

  const triggerWaterBurst = useCallback(
    (origin?: OriginPoint, onPeak?: () => void) => {
      if (isTransitioning) return;
      if (waterEffectFnRef.current) {
        waterEffectFnRef.current(origin, onPeak);
      } else {
        onPeak?.();
      }
    },
    [isTransitioning],
  );

  const toggleMenuWithWater = useCallback(
    (origin?: OriginPoint) => {
      if (isTransitioning) return;
      if (waterEffectFnRef.current) {
        waterEffectFnRef.current(origin, () => setMenuOpen((prev) => !prev));
      } else {
        setMenuOpen((prev) => !prev);
      }
    },
    [isTransitioning],
  );

  const navigateTo = useCallback(
    (href: string, origin?: OriginPoint) => {
      if (isTransitioning) return;
      if (transitionFnRef.current) {
        transitionFnRef.current(href, origin);
      } else {
        setMenuOpen(false);
      }
    },
    [isTransitioning],
  );

  return (
    <AppContext.Provider
      value={{
        engineRef,
        soundMuted,
        menuOpen,
        setMenuOpen,
        toggleMenuWithWater,
        introDone,
        completeIntro,
        ecgBootProgress,
        ecgBootDone,
        cursorMode,
        setCursorMode,
        isTransitioning,
        setIsTransitioning,
        registerTransition,
        registerWaterEffect,
        triggerWaterBurst,
        navigateTo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
