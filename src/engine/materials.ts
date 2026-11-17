import * as THREE from "three";
import { ThemeConfig } from "@/theme.config";

export interface StethoscopeMaterials {
  steelSatin: THREE.MeshPhysicalMaterial;
  chromePolished: THREE.MeshPhysicalMaterial;
  tubing: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshPhysicalMaterial;
  diaphragmFace: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

function createBrushedTexture(radial: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 420; i++) {
    const shade = 110 + ((i * 37) % 45);
    ctx.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, 0.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (radial) {
      const a = (i / 420) * Math.PI * 2;
      ctx.moveTo(128, 128);
      ctx.lineTo(128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128);
    } else {
      const y = (i / 420) * 256;
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createStethoscopeMaterials(
  theme: ThemeConfig,
): StethoscopeMaterials {
  const linearBrush = createBrushedTexture(false);
  const radialBrush = createBrushedTexture(true);

  const steelSatin = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#D4DBD8"),
    metalness: 1,
    roughness: 0.28,
    roughnessMap: linearBrush,
    anisotropy: 0.8,
    clearcoat: 0.45,
  });

  const chromePolished = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#EDF2F0"),
    metalness: 1,
    roughness: 0.08,
    clearcoat: 0.85,
  });

  const diaphragmFace = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#C7D1CD"),
    metalness: 0.92,
    roughness: 0.24,
    roughnessMap: radialBrush,
    anisotropy: 0.85,
    iridescence: 0.18,
  });

  const tubing = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#162328"),
    metalness: 0.06,
    roughness: 0.42,
    clearcoat: 0.3,
  });

  const accent = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme.colors.bold),
    emissive: new THREE.Color(theme.colors.bold),
    emissiveIntensity: 0.22,
    metalness: 0.55,
    roughness: 0.18,
  });

  const dispose = () => {
    linearBrush.dispose();
    radialBrush.dispose();
    steelSatin.dispose();
    chromePolished.dispose();
    diaphragmFace.dispose();
    tubing.dispose();
    accent.dispose();
  };

  return { steelSatin, chromePolished, tubing, accent, diaphragmFace, dispose };
}
