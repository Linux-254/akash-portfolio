"use client";

import { useEffect, useRef, useState } from "react";
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

// Smooth directional liquid spill pouring across the viewport from the clicked edge/end,
// pooling smoothly over everything and draining gently across to the opposite end.
const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uMode;
uniform float uTime;
uniform float uMobile;
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
    p = rot * p * 1.98;
    a *= 0.5;
  }
  return v;
}

void main() {
  if (uProgress <= 0.001) discard;

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = vUv * vec2(aspect, 1.0);
  vec2 spillStart = vec2(clamp(uOrigin.x, 0.05, 0.95) * aspect, clamp(uOrigin.y, 0.05, 0.95));
  float distFromOrigin = length(uv - spillStart);

  // Smooth directional sweep vector from spill origin across the whole canvas
  vec2 dir = normalize(vec2(0.5 * aspect, 0.5) - spillStart + vec2(0.001, 0.25));
  float sweepProjection = dot(uv - spillStart, dir) * 0.42 + distFromOrigin * 0.48;

  vec2 q = vec2(
    fbm(uv * 1.65 + vec2(uTime * 0.16, -uTime * 0.12)),
    fbm(uv * 1.65 + vec2(4.1 - uTime * 0.14, 1.7 + uTime * 0.16))
  );
  vec2 r = vec2(
    fbm(uv * 2.1 + 1.6 * q + vec2(1.4, 7.2) + uTime * 0.11),
    fbm(uv * 2.1 + 1.6 * q + vec2(6.3, 2.2) - uTime * 0.1)
  );
  float fluidWave = fbm(uv * 1.85 + 1.8 * r);
  float verticalStreams = fbm(vec2(vUv.x * 7.5, vUv.y * 1.15 - uTime * 0.35) + q * 0.7);

  float field;
  float thresh;
  if (uMobile > 0.5) {
    if (uMode < 0.5) {
      field = min(distFromOrigin * 0.55, vUv.y * 0.78) - verticalStreams * 0.42 - fluidWave * 0.24;
      thresh = mix(-0.78, 1.65, uProgress);
    } else {
      field = (1.0 - vUv.y) * 0.78 + verticalStreams * 0.38 + fluidWave * 0.22;
      thresh = mix(1.75, -0.78, 1.0 - uProgress);
    }
  } else if (uMode < 0.5) {
    // Organic pour starting from clicked corner/button and sweeping continuously across
    field = sweepProjection - fluidWave * 0.44 - length(r - 0.5) * 0.22;
    thresh = mix(-0.85, 2.15, uProgress);
  } else {
    // Recedes gracefully toward opposite side
    field = (1.25 - sweepProjection) + fluidWave * 0.44 + length(q - 0.5) * 0.2;
    thresh = mix(2.25, -0.82, 1.0 - uProgress);
  }

  float softEdge = smoothstep(field - 0.32, field + 0.08, thresh);
  float solidPool = smoothstep(field - 0.05, field + 0.04, thresh);
  float alpha = mix(softEdge * 0.58, 1.0, solidPool);
  if (alpha <= 0.01) discard;

  float rimGlow = smoothstep(0.18, 0.0, abs(thresh - field));
  vec3 deepTint = mix(uColor, uDark, 0.24);
  vec3 softTint = mix(uColor, uLight, 0.26);
  vec3 col = mix(softTint, deepTint, smoothstep(0.25, 0.85, fluidWave));
  col = mix(col, uColor, length(r) * 0.55);
  col = mix(col, mix(uColor, uLight, 0.45), rimGlow * 0.36);

  gl_FragColor = vec4(col, alpha * clamp(uProgress * 3.5, 0.0, 1.0));
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
  const [fallbackActive, setFallbackActive] = useState(false);

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

    const triggerFluidCycle = (
      origin: OriginPoint | undefined,
      onPeak: () => void,
      customCover?: number,
      customDrain?: number,
    ) => {
      if (!renderer || !mat || !sceneRef || !camRef) {
        onPeak();
        return;
      }
      const mobile = isMobileViewport();
      const coverDur = customCover ?? (mobile ? 0.68 : 0.88);
      const drainDur = customDrain ?? (mobile ? 0.62 : 0.84);

      gsap.killTweensOf(mat.uniforms.uProgress);
      cancelAnimationFrame(rafId);
      setIsTransitioning(true);
      active = true;
      clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(() => {
        active = false;
        cancelAnimationFrame(rafId);
        setIsTransitioning(false);
      }, 2800);

      mat.uniforms.uMobile.value = mobile ? 1 : 0;
      mat.uniforms.uMode.value = 0;
      mat.uniforms.uProgress.value = 0;
      mat.uniforms.uOrigin.value.set(origin?.x ?? 0.08, origin?.y ?? (mobile ? 0.08 : 0.9));

      const loop = (now: number) => {
        if (!active || !renderer || !mat || !sceneRef || !camRef) return;
        mat.uniforms.uTime.value = now * 0.001;
        renderer.render(sceneRef, camRef);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);

      gsap.to(mat.uniforms.uProgress, {
        value: 1,
        duration: coverDur,
        ease: "sine.inOut",
        onComplete: () => {
          onPeak();
          mat!.uniforms.uMode.value = 1;
          gsap.to(mat!.uniforms.uProgress, {
            value: 0,
            duration: drainDur,
            delay: 0.06,
            ease: "sine.inOut",
            onComplete: () => {
              clearTimeout(safetyTimer);
              active = false;
              cancelAnimationFrame(rafId);
              renderer?.clear();
              setIsTransitioning(false);
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
          uniforms: {
            uProgress: { value: 0 },
            uMode: { value: 0 },
            uTime: { value: 0 },
            uMobile: { value: isMobileViewport() ? 1 : 0 },
            uOrigin: { value: new THREE.Vector2(0.08, 0.9) },
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
          mat.uniforms.uMobile.value = isMobileViewport() ? 1 : 0;
        };
        window.addEventListener("resize", onResize);

        const unsub = subscribeTheme((t) => {
          mat?.uniforms.uColor.value.set(t.colors.bold);
          mat?.uniforms.uDark.value.set(t.colors.neutralDark);
          mat?.uniforms.uLight.value.set(t.colors.neutralLight);
        });

        registerTransition((href, origin) => {
          if (href === pathnameRef.current) {
            triggerFluidCycle(origin, () => setMenuOpen(false), 0.56, 0.54);
            return;
          }
          triggerFluidCycle(origin, () => {
            setMenuOpen(false);
            ScrollTrigger.getAll().forEach((st) => st.kill());
            router.push(href);
            window.scrollTo(0, 0);
            engineRef.current?.setRoute(href);
          });
        });

        registerWaterEffect((origin, onPeak) => {
          const mobile = isMobileViewport();
          triggerFluidCycle(
            origin,
            () => onPeak?.(),
            mobile ? 0.62 : 0.76,
            mobile ? 0.58 : 0.74,
          );
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

    registerTransition((href) => {
      if (href === pathnameRef.current) {
        setMenuOpen(false);
        return;
      }
      setIsTransitioning(true);
      setFallbackActive(true);
      setTimeout(() => {
        setMenuOpen(false);
        ScrollTrigger.getAll().forEach((st) => st.kill());
        router.push(href);
        window.scrollTo(0, 0);
        setTimeout(() => {
          setFallbackActive(false);
          setIsTransitioning(false);
        }, 260);
      }, 260);
    });

    registerWaterEffect((_origin, onPeak) => onPeak?.());
  }, [registerTransition, registerWaterEffect, router, setIsTransitioning, setMenuOpen, engineRef]);

  return (
    <>
      <div ref={hostRef} aria-hidden="true" />
      <div className={`paint-fallback ${fallbackActive ? "is-active" : ""}`} aria-hidden="true" />
    </>
  );
}
