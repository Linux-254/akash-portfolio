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

// Stethoscope starts full behind the hero, showcases exploded parts mid-scroll,
// and gently settles smaller around the viewport center across all routes & viewports.
export const HOME_CUES: CameraCue[] = [
  { id: "hero", at: 0.0, shot: { frame: 148, polar: 12, azimuth: 16, offsetX: 0.05, offsetY: 0.01, explode: 0, timeScale: 1, scaleMul: 1.0 } },
  { id: "close", at: 0.34, shot: { frame: 124, polar: 20, azimuth: -16, offsetX: 0.02, offsetY: 0.0, explode: 0.12, timeScale: 0.3, scaleMul: 0.94 } },
  { id: "apart", at: 0.78, shot: { frame: 182, polar: 42, azimuth: 34, offsetX: 0.0, offsetY: 0.01, explode: 0.92, timeScale: 0.55, scaleMul: 0.86 } },
  { id: "around", at: 1.18, shot: { frame: 174, polar: 52, azimuth: 78, offsetX: 0.02, offsetY: -0.01, explode: 0.42, timeScale: 0.72, scaleMul: 0.74 } },
  { id: "rebuild", at: 1.56, shot: { frame: 166, polar: 20, azimuth: 14, offsetX: 0.02, offsetY: -0.02, explode: 0, timeScale: 0.85, scaleMul: 0.62 } },
  { id: "outro", at: 2.0, shot: { frame: 162, polar: 12, azimuth: -10, offsetX: 0.02, offsetY: -0.02, explode: 0, timeScale: 0.9, scaleMul: 0.56 } },
];

export const ROUTE_CUES: Record<string, CameraCue[]> = {
  "/about": [
    { id: "about-a", at: 0, shot: { frame: 162, polar: 18, azimuth: -20, offsetX: 0.03, offsetY: 0.0, explode: 0, timeScale: 0.8, scaleMul: 0.68 } },
    { id: "about-b", at: 2, shot: { frame: 158, polar: 32, azimuth: 20, offsetX: 0.02, offsetY: -0.02, explode: 0.1, timeScale: 0.8, scaleMul: 0.58 } },
  ],
  "/leadership": [
    { id: "lead-a", at: 0, shot: { frame: 156, polar: 18, azimuth: 14, offsetX: 0.03, offsetY: 0.0, explode: 0, timeScale: 1, scaleMul: 0.74 } },
    { id: "lead-b", at: 1, shot: { frame: 176, polar: 38, azimuth: 48, offsetX: 0.0, offsetY: -0.01, explode: 0.38, timeScale: 0.55, scaleMul: 0.66 } },
    { id: "lead-c", at: 2, shot: { frame: 160, polar: 18, azimuth: -14, offsetX: 0.02, offsetY: -0.02, explode: 0, timeScale: 0.9, scaleMul: 0.58 } },
  ],
  "/initiatives": [
    { id: "init-a", at: 0, shot: { frame: 166, polar: 24, azimuth: -24, offsetX: 0.02, offsetY: 0.0, explode: 0.1, timeScale: 0.85, scaleMul: 0.70 } },
    { id: "init-b", at: 2, shot: { frame: 160, polar: 36, azimuth: 28, offsetX: 0.02, offsetY: -0.02, explode: 0.16, timeScale: 0.85, scaleMul: 0.58 } },
  ],
  "/contact": [
    { id: "contact-a", at: 0, shot: { frame: 174, polar: 16, azimuth: 10, offsetX: 0.02, offsetY: -0.01, explode: 0, timeScale: 0.5, scaleMul: 0.64 } },
    { id: "contact-b", at: 2, shot: { frame: 170, polar: 20, azimuth: 16, offsetX: 0.02, offsetY: -0.02, explode: 0, timeScale: 0.5, scaleMul: 0.58 } },
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
