import * as THREE from "three";

export interface CueShot {
  frame: number;
  polar: number;
  azimuth: number;
  offsetX: number;
  offsetY: number;
  explode: number;
  timeScale: number;
  scaleMul: number;
}

export interface CameraCue {
  id: string;
  at: number;
  shot: Partial<CueShot>;
}

const DEFAULT_SHOT: CueShot = {
  frame: 145,
  polar: 14,
  azimuth: 18,
  offsetX: 0.14,
  offsetY: 0,
  explode: 0,
  timeScale: 1,
  scaleMul: 1,
};

// Stethoscope begins centered before scroll, moves dynamically around within safe viewport
// bounds during scroll while showcasing its exploded anatomy, and reforms back at center.
export const HOME_CUES: CameraCue[] = [
  { id: "hero", at: 0.0, shot: { frame: 150, polar: 12, azimuth: 16, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 1, scaleMul: 0.98 } },
  { id: "glide-left", at: 0.34, shot: { frame: 142, polar: 22, azimuth: -24, offsetX: -0.26, offsetY: 0.08, explode: 0.14, timeScale: 0.45, scaleMul: 0.90 } },
  { id: "apart-right", at: 0.76, shot: { frame: 184, polar: 42, azimuth: 36, offsetX: 0.25, offsetY: -0.05, explode: 0.94, timeScale: 0.6, scaleMul: 0.84 } },
  { id: "orbit-upper", at: 1.18, shot: { frame: 174, polar: 52, azimuth: 78, offsetX: -0.20, offsetY: 0.14, explode: 0.48, timeScale: 0.75, scaleMul: 0.76 } },
  { id: "recollect", at: 1.60, shot: { frame: 164, polar: 20, azimuth: 12, offsetX: 0.05, offsetY: -0.03, explode: 0.06, timeScale: 0.85, scaleMul: 0.66 } },
  { id: "outro", at: 2.0, shot: { frame: 158, polar: 12, azimuth: -8, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.9, scaleMul: 0.58 } },
];

export const ROUTE_CUES: Record<string, CameraCue[]> = {
  "/about": [
    { id: "about-start", at: 0, shot: { frame: 162, polar: 18, azimuth: -18, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.8, scaleMul: 0.70 } },
    { id: "about-roam", at: 1, shot: { frame: 170, polar: 32, azimuth: 28, offsetX: 0.22, offsetY: 0.08, explode: 0.46, timeScale: 0.7, scaleMul: 0.68 } },
    { id: "about-center", at: 2, shot: { frame: 158, polar: 20, azimuth: 12, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.85, scaleMul: 0.58 } },
  ],
  "/leadership": [
    { id: "lead-start", at: 0, shot: { frame: 158, polar: 18, azimuth: 14, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.9, scaleMul: 0.74 } },
    { id: "lead-roam", at: 1, shot: { frame: 176, polar: 38, azimuth: -32, offsetX: -0.22, offsetY: 0.06, explode: 0.52, timeScale: 0.6, scaleMul: 0.68 } },
    { id: "lead-center", at: 2, shot: { frame: 160, polar: 16, azimuth: -10, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.9, scaleMul: 0.58 } },
  ],
  "/initiatives": [
    { id: "init-start", at: 0, shot: { frame: 164, polar: 22, azimuth: -20, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.85, scaleMul: 0.72 } },
    { id: "init-roam", at: 1, shot: { frame: 174, polar: 36, azimuth: 30, offsetX: 0.22, offsetY: -0.06, explode: 0.48, timeScale: 0.7, scaleMul: 0.66 } },
    { id: "init-center", at: 2, shot: { frame: 160, polar: 20, azimuth: 14, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.85, scaleMul: 0.58 } },
  ],
  "/contact": [
    { id: "contact-start", at: 0, shot: { frame: 170, polar: 16, azimuth: 10, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.65, scaleMul: 0.66 } },
    { id: "contact-roam", at: 1, shot: { frame: 178, polar: 26, azimuth: -22, offsetX: -0.18, offsetY: 0.06, explode: 0.28, timeScale: 0.6, scaleMul: 0.64 } },
    { id: "contact-center", at: 2, shot: { frame: 166, polar: 18, azimuth: 12, offsetX: 0.0, offsetY: 0.0, explode: 0, timeScale: 0.7, scaleMul: 0.58 } },
  ],
};

function mergeShot(partial: Partial<CueShot>): CueShot {
  return { ...DEFAULT_SHOT, ...partial };
}

export function sampleCues(route: string, progress: number): CueShot {
  const list = ROUTE_CUES[route] ?? HOME_CUES;
  const p = THREE.MathUtils.clamp(progress, list[0].at, list[list.length - 1].at);

  let a = list[0];
  let b = list[list.length - 1];
  for (let i = 0; i < list.length - 1; i++) {
    if (p >= list[i].at && p <= list[i + 1].at) {
      a = list[i];
      b = list[i + 1];
      break;
    }
  }

  const sa = mergeShot(a.shot);
  const sb = mergeShot(b.shot);
  const span = Math.max(b.at - a.at, 0.0001);
  const t = THREE.MathUtils.smoothstep((p - a.at) / span, 0, 1);

  return {
    frame: THREE.MathUtils.lerp(sa.frame, sb.frame, t),
    polar: THREE.MathUtils.lerp(sa.polar, sb.polar, t),
    azimuth: THREE.MathUtils.lerp(sa.azimuth, sb.azimuth, t),
    offsetX: THREE.MathUtils.lerp(sa.offsetX, sb.offsetX, t),
    offsetY: THREE.MathUtils.lerp(sa.offsetY, sb.offsetY, t),
    explode: THREE.MathUtils.lerp(sa.explode, sb.explode, t),
    timeScale: THREE.MathUtils.lerp(sa.timeScale, sb.timeScale, t),
    scaleMul: THREE.MathUtils.lerp(sa.scaleMul, sb.scaleMul, t),
  };
}

export function frameToDistance(
  frameMm: number,
  fovDeg: number,
  aspect: number,
  explode = 0,
): number {
  const worldSize = frameMm * 0.02 * (1 + Math.max(0, explode) * 0.24);
  const halfFov = THREE.MathUtils.degToRad(fovDeg * 0.5);
  const tanHalf = Math.tan(halfFov);
  const safeAspect = Math.max(aspect, 0.35);
  const vDist = (worldSize * 1.14) / (2 * tanHalf);
  const hDist = (worldSize * 1.04) / (2 * tanHalf * safeAspect);
  return Math.max(vDist, hDist, 2.4);
}
