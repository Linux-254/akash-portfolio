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

// Stethoscope starts large behind hero headline, showcases parts mid-scroll,
// then shrinks slightly smaller beside the docked full-body walking avatar.
export const HOME_CUES: CameraCue[] = [
  { id: "hero", at: 0.0, shot: { frame: 132, polar: 12, azimuth: 16, offsetX: 0.16, offsetY: 0.02, explode: 0, timeScale: 1, scaleMul: 1.05 } },
  { id: "close", at: 0.34, shot: { frame: 78, polar: 22, azimuth: -16, offsetX: 0.06, offsetY: 0.0, explode: 0.08, timeScale: 0.25, scaleMul: 0.9 } },
  { id: "apart", at: 0.78, shot: { frame: 185, polar: 48, azimuth: 36, offsetX: 0.0, offsetY: 0.02, explode: 0.95, timeScale: 0.55, scaleMul: 0.84 } },
  { id: "around", at: 1.18, shot: { frame: 170, polar: 66, azimuth: 92, offsetX: 0.18, offsetY: -0.06, explode: 0.45, timeScale: 0.72, scaleMul: 0.58 } },
  { id: "rebuild", at: 1.56, shot: { frame: 162, polar: 20, azimuth: 14, offsetX: 0.34, offsetY: -0.22, explode: 0, timeScale: 0.85, scaleMul: 0.30 } },
  { id: "outro", at: 2.0, shot: { frame: 158, polar: 12, azimuth: -10, offsetX: 0.36, offsetY: -0.24, explode: 0, timeScale: 0.9, scaleMul: 0.26 } },
];

export const ROUTE_CUES: Record<string, CameraCue[]> = {
  "/about": [
    { id: "about-a", at: 0, shot: { frame: 165, polar: 20, azimuth: -22, offsetX: 0.32, offsetY: -0.18, explode: 0, timeScale: 0.8, scaleMul: 0.34 } },
    { id: "about-b", at: 2, shot: { frame: 158, polar: 34, azimuth: 22, offsetX: 0.35, offsetY: -0.23, explode: 0.1, timeScale: 0.8, scaleMul: 0.28 } },
  ],
  "/leadership": [
    { id: "lead-a", at: 0, shot: { frame: 155, polar: 18, azimuth: 14, offsetX: 0.26, offsetY: -0.12, explode: 0, timeScale: 1, scaleMul: 0.46 } },
    { id: "lead-b", at: 1, shot: { frame: 175, polar: 42, azimuth: 56, offsetX: 0.3, offsetY: -0.18, explode: 0.42, timeScale: 0.5, scaleMul: 0.36 } },
    { id: "lead-c", at: 2, shot: { frame: 158, polar: 18, azimuth: -14, offsetX: 0.35, offsetY: -0.23, explode: 0, timeScale: 0.9, scaleMul: 0.28 } },
  ],
  "/initiatives": [
    { id: "init-a", at: 0, shot: { frame: 168, polar: 26, azimuth: -28, offsetX: 0.3, offsetY: -0.16, explode: 0.1, timeScale: 0.85, scaleMul: 0.38 } },
    { id: "init-b", at: 2, shot: { frame: 160, polar: 38, azimuth: 32, offsetX: 0.35, offsetY: -0.23, explode: 0.16, timeScale: 0.85, scaleMul: 0.28 } },
  ],
  "/contact": [
    { id: "contact-a", at: 0, shot: { frame: 195, polar: 16, azimuth: 10, offsetX: 0.34, offsetY: -0.2, explode: 0, timeScale: 0.5, scaleMul: 0.32 } },
    { id: "contact-b", at: 2, shot: { frame: 195, polar: 20, azimuth: 16, offsetX: 0.36, offsetY: -0.23, explode: 0, timeScale: 0.5, scaleMul: 0.28 } },
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

export function frameToDistance(frameMm: number, fovDeg: number, aspect: number): number {
  const worldSize = frameMm * 0.02;
  const halfFov = THREE.MathUtils.degToRad(fovDeg * 0.5);
  const vDist = worldSize / (2 * Math.tan(halfFov));
  const hDist = worldSize / (2 * Math.tan(halfFov) * Math.max(aspect, 0.5));
  return Math.max(vDist, hDist * 0.85, 1.8);
}
