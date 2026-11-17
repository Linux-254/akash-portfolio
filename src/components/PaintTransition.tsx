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

// Volumetric FBM liquid fog & smoke wave shader (subtle & translucent)
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
  for (int i = 0; i < 5; i++) {
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

  // Atmospheric rolling fog domain warping
  vec2 p = uv * 1.8;
  vec2 q = vec2(
    fbm(p + vec2(uTime * 0.14, -uTime * 0.12)),
    fbm(p + vec2(5.2, 1.3) + vec2(-uTime * 0.11, uTime * 0.15))
  );
  vec2 r = vec2(
    fbm(p + 2.6 * q + vec2(1.7, 9.2) + uTime * 0.1),
    fbm(p + 2.6 * q + vec2(8.3, 2.8) - uTime * 0.09)
  );
  float fog = fbm(p + 2.8 * r + vec2(uTime * 0.06, -uTime * 0.08));

  float dist = length(uv - origin);
  float waveRipple = sin(dist * 9.0 - uTime * 2.4 - uProgress * 10.0) * 0.08;
  vec2 driftDir = normalize(vec2(0.5 * aspect, 0.5) - origin + vec2(0.001, 0.001));
  float driftProj = dot(uv - origin, driftDir);

  float currentRadius;
  float edgeDist;
  float solidPool;
  float softEdge;

  if (uMode < 0.5) {
    currentRadius = uProgress * (maxD * 1.35 + 0.5);
    float waveFront = dist + driftProj * 0.14 - (fog * 0.52 + waveRipple + length(r) * 0.24);
    edgeDist = waveFront - currentRadius;
    solidPool = smoothstep(0.08, -0.05, edgeDist);
    softEdge = smoothstep(0.42, -0.1, edgeDist);
    if (uProgress >= 0.96) {
      solidPool = 1.0;
      softEdge = 1.0;
    }
  } else {
    float drainRadius = (1.0 - uProgress) * (maxD * 1.38 + 0.55);
    float waveFront = dist + driftProj * 0.14 - (fog * 0.52 + waveRipple + length(r) * 0.24);
    edgeDist = waveFront - drainRadius;
    solidPool = smoothstep(-0.05, 0.08, edgeDist);
    softEdge = smoothstep(-0.1, 0.42, edgeDist);
  }

  float alpha = mix(softEdge * 0.7, 0.88, solidPool);
  if (alpha <= 0.01) discard;

  vec3 deepInk = mix(uColor, uDark, 0.45);
  vec3 fluidBody = uColor;
  vec3 mistFoam = mix(uColor, uLight, 0.65);
  vec3 smokeGlow = mix(uLight, vec3(1.0), 0.4);

  vec3 col = mix(deepInk, fluidBody, smoothstep(0.2, 0.75, fog));
  col = mix(col, mistFoam, smoothstep(0.6, 0.92, waveRipple + fog * 0.45));

  float rim = smoothstep(0.25, 0.0, abs(edgeDist)) * 0.55;
  col = mix(col, smokeGlow, rim);

  gl_FragColor = vec4(col, alpha * 0.76);
  #include <colorspace_fragment>
}`;

function isMobileViewport(): boolean {
  return (
    window.innerWidth <= 768 ||
    (window.innerWidth <= 1024 && window.matchMedia("(pointer: coarse)").matches)
  );
}

// Generate organic rolling fog plumes that billow outwards continuously without sudden pops
function generateFogSpillPath(
  ox: number,
  oy: number,
  radius: number,
  wavePhase: number,
  scaleMod = 1,
): string {
  if (radius <= 2) return "";
  const N = 40;
  const points: { x: number; y: number }[] = [];
  const r = radius * scaleMod;

  for (let i = 0; i < N; i++) {
    const angle = (i / N) * 2 * Math.PI;
    const plume =
      Math.sin(angle * 3 + wavePhase) * 0.2
      + Math.cos(angle * 2 - wavePhase * 1.1) * 0.16
      + Math.sin(angle * 5 + wavePhase * 1.6) * 0.1;
    const curR = r * (1 + plume);
    points.push({
      x: ox + curR * Math.cos(angle),
      y: oy + curR * Math.sin(angle),
    });
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const curr = points[i];
    const next = points[(i + 1) % N];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  d += " Z";
  return d;
}

// Generate sweeping fog drain path that rolls across and dissipates smoothly
function generateFogDrainPath(
  W: number,
  H: number,
  drainY: number,
  wavePhase: number,
  offsetY = 0,
): string {
  const y = drainY + offsetY;
  if (y >= H + 200) return "";
  const M = 24;
  let d = `M 0 ${H} L 0 ${Math.max(0, y).toFixed(1)}`;

  for (let j = 0; j <= M; j++) {
    const x = (j / M) * W;
    const wave =
      Math.sin((j / M) * 3 * Math.PI + wavePhase) * 32
      + Math.cos((j / M) * 5 * Math.PI - wavePhase * 1.2) * 18;
    const ptY = Math.max(0, y + wave);
    d += ` L ${x.toFixed(1)} ${ptY.toFixed(1)}`;
  }

  d += ` L ${W} ${H} Z`;
  return d;
}

function generateFogFoamPath(
  W: number,
  drainY: number,
  wavePhase: number,
  offsetY = 0,
): string {
  const y = drainY + offsetY;
  const M = 24;
  let d = `M 0 ${(y + Math.cos(wavePhase) * 16).toFixed(1)}`;

  for (let j = 0; j <= M; j++) {
    const x = (j / M) * W;
    const wave =
      Math.sin((j / M) * 3 * Math.PI + wavePhase) * 32
      + Math.cos((j / M) * 5 * Math.PI - wavePhase * 1.2) * 18;
    const ptY = Math.max(0, y + wave);
    d += ` L ${x.toFixed(1)} ${ptY.toFixed(1)}`;
  }
  return d;
}

export function PaintTransition() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pathBaseRef = useRef<SVGPathElement | null>(null);
  const pathMidRef = useRef<SVGPathElement | null>(null);
  const pathFoamRef = useRef<SVGPathElement | null>(null);
  const [stageActive, setStageActive] = useState(false);

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

  useEffect(() => {
    pathnameRef.current = pathname;
    engineRef.current?.setRoute(pathname);
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

    const executeCycle = (
      origin: OriginPoint | undefined,
      onPeak: () => void,
      customCover?: number,
      customDrain?: number,
    ) => {
      const mobile = isMobileViewport();
      // Moderate speed: smooth, graceful fog spreading across the viewport
      const coverDur = customCover ?? (mobile ? 0.78 : 0.88);
      const drainDur = customDrain ?? (mobile ? 0.74 : 0.84);

      const W = window.innerWidth;
      const H = window.innerHeight;
      const ox = (origin?.x ?? 0.85) * W;
      const oy = (1 - (origin?.y ?? 0.85)) * H;
      const maxDist = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));

      setIsTransitioning(true);
      setStageActive(true);
      active = true;

      clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(() => {
        active = false;
        cancelAnimationFrame(rafId);
        setIsTransitioning(false);
        setStageActive(false);
      }, 3500);

      if (mat) {
        mat.uniforms.uMode.value = 0;
        mat.uniforms.uProgress.value = 0;
        mat.uniforms.uOrigin.value.set(
          origin?.x ?? 0.85,
          origin?.y ?? 0.85,
        );
      }

      const loop = (now: number) => {
        if (!active) return;
        if (renderer && mat && sceneRef && camRef) {
          mat.uniforms.uTime.value = now * 0.001;
          renderer.render(sceneRef, camRef);
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);

      const anim = { p: 0, wave: 0 };
      gsap.killTweensOf(anim);

      // Phase 1: Subtle fog expansion spreading smoothly from origin
      gsap.to(anim, {
        p: 1,
        wave: Math.PI * 3.5,
        duration: coverDur,
        ease: "power2.inOut",
        onUpdate: () => {
          if (mat) {
            mat.uniforms.uProgress.value = anim.p;
            mat.uniforms.uMode.value = 0;
          }
          // Smooth continuous expansion past screen boundaries — zero abrupt rectangular snap
          const r = anim.p * maxDist * 1.55;
          pathBaseRef.current?.setAttribute(
            "d",
            generateFogSpillPath(ox, oy, r, anim.wave, 1.0),
          );
          pathMidRef.current?.setAttribute(
            "d",
            generateFogSpillPath(ox, oy, r, anim.wave, 0.93),
          );
          pathFoamRef.current?.setAttribute(
            "d",
            generateFogSpillPath(ox, oy, r, anim.wave, 0.97),
          );
        },
        onComplete: () => {
          onPeak();

          // Phase 2: Fog Dissipation & Drain — rolls down smoothly like dissipating mist
          if (mat) {
            mat.uniforms.uMode.value = 1;
          }

          gsap.to(anim, {
            p: 0,
            wave: Math.PI * 7,
            duration: drainDur,
            delay: 0.05,
            ease: "power2.inOut",
            onUpdate: () => {
              if (mat) {
                mat.uniforms.uProgress.value = anim.p;
              }
              const drainY = (1.0 - anim.p) * (H + 200);
              pathBaseRef.current?.setAttribute(
                "d",
                generateFogDrainPath(W, H, drainY, anim.wave, 0),
              );
              pathMidRef.current?.setAttribute(
                "d",
                generateFogDrainPath(W, H, drainY, anim.wave, 24),
              );
              pathFoamRef.current?.setAttribute(
                "d",
                generateFogFoamPath(W, drainY, anim.wave, 0),
              );
            },
            onComplete: () => {
              clearTimeout(safetyTimer);
              active = false;
              cancelAnimationFrame(rafId);
              renderer?.clear();
              setStageActive(false);
              setIsTransitioning(false);
              pathBaseRef.current?.setAttribute("d", "");
              pathMidRef.current?.setAttribute("d", "");
              pathFoamRef.current?.setAttribute("d", "");
            },
          });
        },
      });
    };

    if (host && !reduced) {
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
        renderer.domElement.className = "paint-canvas";
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
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
            executeCycle(origin, () => setMenuOpen(false), 0.58, 0.58);
            return;
          }
          executeCycle(origin, () => {
            setMenuOpen(false);
            ScrollTrigger.getAll().forEach((st) => st.kill());
            router.push(href);
            window.scrollTo(0, 0);
            engineRef.current?.setRoute(href);
          });
        });

        registerWaterEffect((origin, onPeak) => {
          executeCycle(origin, () => onPeak?.());
        });

        return () => {
          clearTimeout(safetyTimer);
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

    // Fallback if reduced motion or WebGL unavailable: still executes smoothly with SVG fog wave
    registerTransition((href, origin) => {
      if (reduced) {
        setMenuOpen(false);
        ScrollTrigger.getAll().forEach((st) => st.kill());
        router.push(href);
        window.scrollTo(0, 0);
        return;
      }
      if (href === pathnameRef.current) {
        executeCycle(origin, () => setMenuOpen(false), 0.58, 0.58);
        return;
      }
      executeCycle(origin, () => {
        setMenuOpen(false);
        ScrollTrigger.getAll().forEach((st) => st.kill());
        router.push(href);
        window.scrollTo(0, 0);
      });
    });

    registerWaterEffect((origin, onPeak) => {
      if (reduced) {
        onPeak?.();
        return;
      }
      executeCycle(origin, () => onPeak?.());
    });
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

      {/* Subtle, translucent SVG Fog Wave Stage matching brand palette */}
      <div
        ref={stageRef}
        className={`liquid-spill-stage ${stageActive ? "is-active" : ""}`}
        aria-hidden="true"
      >
        <svg
          className="liquid-spill-svg"
          viewBox="0 0 100% 100%"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Base fog gradient: deep clinical pine-teal with soft transparency */}
            <linearGradient id="fog-gradient-base" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d2822" stopOpacity="0.88" />
              <stop offset="55%" stopColor="#0b7a68" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#051c17" stopOpacity="0.90" />
            </linearGradient>

            {/* Mid fog gradient: vibrant medical emerald mist */}
            <linearGradient id="fog-gradient-mid" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0b7a68" stopOpacity="0.78" />
              <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.68" />
              <stop offset="100%" stopColor="#072b24" stopOpacity="0.80" />
            </linearGradient>

            {/* Mist foam crest gradient: glowing translucent aqua */}
            <linearGradient id="fog-gradient-mist" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#5eead4" stopOpacity="0.75" />
            </linearGradient>

            <filter
              id="liquid-smoke-disp"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.01 0.014"
                numOctaves="3"
                seed="14"
                result="fogNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="fogNoise"
                scale="36"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feGaussianBlur in="displaced" stdDeviation="2.5" />
            </filter>
          </defs>

          {/* Deep fluid base layer */}
          <path
            ref={pathBaseRef}
            className="liquid-wave-base"
            filter="url(#liquid-smoke-disp)"
          />

          {/* Vibrant medical emerald rolling fog wave */}
          <path
            ref={pathMidRef}
            className="liquid-wave-mid"
            filter="url(#liquid-smoke-disp)"
          />

          {/* Shimmering mist and foamy crest line */}
          <path
            ref={pathFoamRef}
            className="liquid-wave-foam"
            filter="url(#liquid-smoke-disp)"
          />
        </svg>
      </div>
    </>
  );
}
