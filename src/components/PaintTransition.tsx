"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OriginPoint, useApp } from "./AppContext";
import { getActiveTheme, subscribeTheme } from "@/theme.config";

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Silky GPU-accelerated atmospheric fog & liquid wave shader.
// Aligns with the site's emerald/pine/mist palette, keeps wispy translucent edges,
// and reaches rich coverage at peak so route swaps underneath are completely seamless.
const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uMode;
uniform float uTime;
uniform vec2 uOrigin;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec3 uDark;
uniform vec3 uLight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  if (uProgress <= 0.001) discard;

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = vUv * vec2(aspect, 1.0);
  vec2 origin = vec2(clamp(uOrigin.x, 0.02, 0.98) * aspect, clamp(uOrigin.y, 0.02, 0.98));

  float d1 = length(origin - vec2(0.0, 0.0));
  float d2 = length(origin - vec2(aspect, 0.0));
  float d3 = length(origin - vec2(0.0, 1.0));
  float d4 = length(origin - vec2(aspect, 1.0));
  float maxD = max(max(d1, d2), max(d3, d4));
  maxD = max(maxD, 1.7);

  vec2 p = uv * 1.75;
  vec2 q = vec2(
    fbm(p + vec2(uTime * 0.18, -uTime * 0.14)),
    fbm(p + vec2(5.2, 1.3) + vec2(-uTime * 0.13, uTime * 0.17))
  );
  vec2 r = vec2(
    fbm(p + 2.2 * q + vec2(1.7, 9.2) + uTime * 0.12),
    fbm(p + 2.2 * q + vec2(8.3, 2.8) - uTime * 0.1)
  );
  float fog = fbm(p + 2.4 * r + vec2(uTime * 0.08, -uTime * 0.09));

  float dist = length(uv - origin);
  float waveRipple = sin(dist * 7.5 - uTime * 2.6 - uProgress * 8.0) * 0.065;
  vec2 driftDir = normalize(vec2(0.5 * aspect, 0.5) - origin + vec2(0.001, 0.001));
  float driftProj = dot(uv - origin, driftDir);

  float edgeDist;
  float solidPool;
  float softEdge;

  if (uMode < 0.5) {
    // Phase 1: Fog wave spreads cleanly across the entire screen
    float currentRadius = uProgress * (maxD * 1.48 + 0.72);
    float waveFront = dist + driftProj * 0.12 - (fog * 0.46 + waveRipple + length(r) * 0.18);
    edgeDist = waveFront - currentRadius;
    solidPool = 1.0 - smoothstep(-0.18, 0.04, edgeDist);
    softEdge = 1.0 - smoothstep(-0.16, 0.46, edgeDist);
    float peakSeal = smoothstep(0.90, 1.0, uProgress);
    solidPool = max(solidPool, peakSeal);
    softEdge = max(softEdge, peakSeal);
  } else {
    // Phase 2: Fog wave parts & dissipates smoothly to reveal the already-rendered new page
    float waveVal = vUv.y * 0.62 + (dist / maxD) * 0.34 + (fog * 0.46 + waveRipple + length(r) * 0.16);
    float clearThresh = mix(-0.35, 1.95, uProgress);
    edgeDist = waveVal - clearThresh;
    solidPool = 1.0 - smoothstep(-0.24, 0.06, edgeDist);
    softEdge = 1.0 - smoothstep(-0.26, 0.54, edgeDist);
    float tailFade = smoothstep(0.0, 0.28, uProgress);
    solidPool *= tailFade;
    softEdge *= tailFade;
  }

  float alpha = mix(softEdge * 0.64, 0.97, solidPool);
  if (alpha <= 0.005) discard;

  // Color palette matching the editorial light/emerald/dark gradient
  vec3 deepPine = mix(uColor, uDark, 0.42);
  vec3 emeraldMist = uColor;
  vec3 softSage = mix(uColor, uLight, 0.52);
  vec3 haloMist = mix(uLight, uColor, 0.32);

  vec3 col = mix(deepPine, emeraldMist, smoothstep(0.18, 0.72, fog));
  col = mix(col, softSage, smoothstep(0.55, 0.92, fog * 0.65 + length(r) * 0.35));

  float rim = (1.0 - smoothstep(0.0, 0.32, abs(edgeDist))) * 0.48;
  col = mix(col, haloMist, rim);

  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

function isMobileViewport(): boolean {
  return (
    window.innerWidth <= 768 ||
    (window.innerWidth <= 1024 && window.matchMedia("(pointer: coarse)").matches)
  );
}

export function PaintTransition() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const {
    registerTransition,
    registerWaterEffect,
    setIsTransitioning,
    setMenuOpen,
    engineRef,
  } = useApp();

  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const routeCommitResolverRef = useRef<{
    targetHref: string;
    resolve: () => void;
  } | null>(null);
  const [fallbackMode, setFallbackMode] = useState<"idle" | "in" | "out">("idle");

  // Detect the exact moment Next.js commits the new route to the DOM,
  // wait two animation frames so the new page is painted, then release Phase 2!
  useEffect(() => {
    pathnameRef.current = pathname;
    engineRef.current?.setRoute(pathname);

    const pending = routeCommitResolverRef.current;
    if (pending && pathname === pending.targetHref) {
      routeCommitResolverRef.current = null;
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          pending.resolve();
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
  }, [pathname, engineRef]);

  useEffect(() => {
    const host = hostRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer | null = null;
    let mat: THREE.ShaderMaterial | null = null;
    let sceneRef: THREE.Scene | null = null;
    let camRef: THREE.OrthographicCamera | null = null;
    let rafId = 0;
    let active = false;
    let safetyTimer = 0;

    const finishCycle = () => {
      clearTimeout(safetyTimer);
      routeCommitResolverRef.current = null;
      active = false;
      cancelAnimationFrame(rafId);
      renderer?.clear();
      setIsTransitioning(false);
    };

    const waitForRouteIfNeeded = (targetHref?: string): Promise<void> => {
      if (!targetHref || pathnameRef.current === targetHref) {
        return new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
      }
      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          if (routeCommitResolverRef.current?.targetHref === targetHref) {
            routeCommitResolverRef.current = null;
          }
          resolve();
        }, 2200);

        routeCommitResolverRef.current = {
          targetHref,
          resolve: () => {
            clearTimeout(timeoutId);
            resolve();
          },
        };
      });
    };

    const executeWebGLCycle = (
      origin: OriginPoint | undefined,
      onPeak: () => void,
      options?: { coverDur?: number; drainDur?: number; waitForHref?: string },
    ) => {
      if (!renderer || !mat || !sceneRef || !camRef) {
        onPeak();
        return;
      }

      const mobile = isMobileViewport();
      const coverDur = options?.coverDur ?? (mobile ? 0.56 : 0.66);
      const drainDur = options?.drainDur ?? (mobile ? 0.62 : 0.74);

      setIsTransitioning(true);
      active = true;
      clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(finishCycle, 4200);

      const anim = { p: 0 };
      gsap.killTweensOf(anim);
      cancelAnimationFrame(rafId);

      mat.uniforms.uMode.value = 0;
      mat.uniforms.uProgress.value = 0;
      mat.uniforms.uOrigin.value.set(origin?.x ?? 0.85, origin?.y ?? 0.85);

      const loop = (now: number) => {
        if (!active || !renderer || !mat || !sceneRef || !camRef) return;
        mat.uniforms.uTime.value = now * 0.001;
        renderer.render(sceneRef, camRef);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);

      // Phase 1: Fog rolls out organically to veil the current view
      gsap.to(anim, {
        p: 1,
        duration: coverDur,
        ease: "power2.inOut",
        onUpdate: () => {
          if (mat) mat.uniforms.uProgress.value = anim.p;
        },
        onComplete: async () => {
          onPeak();
          // Crucial: Hold cover until the target route has ACTUALLY committed & painted underneath!
          await waitForRouteIfNeeded(options?.waitForHref);
          if (!active || !mat) return;

          mat.uniforms.uMode.value = 1;
          mat.uniforms.uProgress.value = 1;
          anim.p = 1;

          // Phase 2: Fog dissipates smoothly, immediately revealing the already-rendered new page
          gsap.to(anim, {
            p: 0,
            duration: drainDur,
            ease: "power2.out",
            onUpdate: () => {
              if (mat) mat.uniforms.uProgress.value = anim.p;
            },
            onComplete: finishCycle,
          });
        },
      });
    };

    if (host && !reduced) {
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
        renderer.domElement.className = "paint-canvas";
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        host.appendChild(renderer.domElement);

        sceneRef = new THREE.Scene();
        camRef = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const theme = getActiveTheme();

        mat = new THREE.ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          uniforms: {
            uProgress: { value: 0 },
            uMode: { value: 0 },
            uTime: { value: 0 },
            uOrigin: { value: new THREE.Vector2(0.85, 0.85) },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uColor: { value: new THREE.Color(theme.colors.bold) },
            uDark: { value: new THREE.Color(theme.colors.neutralDark) },
            uLight: { value: new THREE.Color(theme.colors.neutralLight) },
          },
        });

        const geo = new THREE.PlaneGeometry(2, 2);
        sceneRef.add(new THREE.Mesh(geo, mat));

        const onResize = () => {
          if (!renderer || !mat) return;
          renderer.setSize(window.innerWidth, window.innerHeight, false);
          mat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onResize);

        const unsub = subscribeTheme((t) => {
          mat?.uniforms.uColor.value.set(t.colors.bold);
          mat?.uniforms.uDark.value.set(t.colors.neutralDark);
          mat?.uniforms.uLight.value.set(t.colors.neutralLight);
        });

        registerTransition((href, origin) => {
          if (href === pathnameRef.current) {
            executeWebGLCycle(origin, () => setMenuOpen(false), {
              coverDur: 0.44,
              drainDur: 0.48,
            });
            return;
          }

          // Start prefetching immediately at transition start
          router.prefetch(href);

          executeWebGLCycle(
            origin,
            () => {
              setMenuOpen(false);
              window.scrollTo(0, 0);
              router.push(href);
              engineRef.current?.setRoute(href);
            },
            { waitForHref: href },
          );
        });

        registerWaterEffect((origin, onPeak) => {
          executeWebGLCycle(origin, () => onPeak?.(), {
            coverDur: 0.46,
            drainDur: 0.52,
          });
        });

        return () => {
          clearTimeout(safetyTimer);
          routeCommitResolverRef.current = null;
          unsub();
          window.removeEventListener("resize", onResize);
          cancelAnimationFrame(rafId);
          geo.dispose();
          mat?.dispose();
          renderer?.dispose();
          renderer?.domElement.remove();
        };
      } catch {
        renderer = null;
      }
    }

    // Reduced motion or WebGL-unavailable fallback with route-commit synchronization
    registerTransition((href) => {
      if (reduced) {
        setMenuOpen(false);
        router.push(href);
        window.scrollTo(0, 0);
        return;
      }
      if (href === pathnameRef.current) {
        setMenuOpen(false);
        return;
      }
      setIsTransitioning(true);
      setFallbackMode("in");
      router.prefetch(href);
      window.setTimeout(async () => {
        setMenuOpen(false);
        window.scrollTo(0, 0);
        router.push(href);
        await waitForRouteIfNeeded(href);
        setFallbackMode("out");
        window.setTimeout(() => {
          setFallbackMode("idle");
          setIsTransitioning(false);
        }, 380);
      }, 280);
    });

    registerWaterEffect((_origin, onPeak) => onPeak?.());
  }, [
    registerTransition,
    registerWaterEffect,
    router,
    setIsTransitioning,
    setMenuOpen,
    engineRef,
  ]);

  return (
    <>
      <div ref={hostRef} aria-hidden="true" />
      <div
        className={`paint-fallback ${fallbackMode === "in" ? "is-active" : fallbackMode === "out" ? "is-draining" : ""}`}
        aria-hidden="true"
      />
    </>
  );
}
