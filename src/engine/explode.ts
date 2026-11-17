import { StethoscopePart } from "./parts";

function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

export function applyExplode(parts: StethoscopePart[], explode: number): void {
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const delay = (1 - p.order) * 0.42;
    const t = easeOutCubic((explode - delay) / 0.58);
    p.mesh.position.set(
      p.basePos.x + p.lift.x * t,
      p.basePos.y + p.lift.y * t,
      p.basePos.z + p.lift.z * t,
    );
  }
}
