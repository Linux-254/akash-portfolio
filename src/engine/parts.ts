import * as THREE from "three";
import { StethoscopeMaterials } from "./materials";

export interface StethoscopePart {
  id: string;
  label: string;
  mesh: THREE.Object3D;
  basePos: THREE.Vector3;
  lift: THREE.Vector3;
  order: number;
}

export interface StethoscopeAssembly {
  root: THREE.Group;
  parts: StethoscopePart[];
  accentRing: THREE.Mesh;
}

// Counter-clockwise lathe profiles (millimetres) so normals point outward
function bellProfile(seg: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.05, -7),
    new THREE.Vector2(18, -7),
    new THREE.Vector2(21.5, -5),
    new THREE.Vector2(21.5, 2.5),
    new THREE.Vector2(16, 6),
    new THREE.Vector2(7.5, 9),
    new THREE.Vector2(5.2, 14),
    new THREE.Vector2(0.05, 14),
  ];
  return new THREE.LatheGeometry(pts, seg);
}

// Anatomical double-flanged contoured soft-seal acoustic eartip profile
function eartipProfile(seg: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.05, -5.2),
    new THREE.Vector2(2.4, -5.2),
    new THREE.Vector2(2.8, -3.4),
    new THREE.Vector2(4.9, -1.6),
    new THREE.Vector2(3.6, -0.2),
    new THREE.Vector2(5.4, 1.8),
    new THREE.Vector2(4.6, 4.4),
    new THREE.Vector2(2.5, 6.2),
    new THREE.Vector2(0.9, 6.6),
    new THREE.Vector2(0.05, 6.6),
  ];
  return new THREE.LatheGeometry(pts, seg);
}

export function buildStethoscopeParts(
  mats: StethoscopeMaterials,
  lowDetail = false,
): StethoscopeAssembly {
  const root = new THREE.Group();
  root.scale.setScalar(0.02);

  const latheSeg = lowDetail ? 24 : 48;
  const ringSeg = lowDetail ? 32 : 64;
  const ringRad = lowDetail ? 10 : 18;
  const tubeSeg = lowDetail ? 40 : 72;
  const tubeRad = lowDetail ? 10 : 18;
  const earSeg = lowDetail ? 22 : 40;

  const parts: StethoscopePart[] = [];
  const register = (
    id: string,
    label: string,
    mesh: THREE.Object3D,
    base: [number, number, number],
    lift: [number, number, number],
    order: number,
  ) => {
    mesh.position.set(base[0], base[1], base[2]);
    root.add(mesh);
    parts.push({
      id,
      label,
      mesh,
      basePos: new THREE.Vector3(...base),
      lift: new THREE.Vector3(...lift),
      order,
    });
  };

  // 1. Machined stainless chestpiece bell (43 mm diameter)
  const bell = new THREE.Mesh(bellProfile(latheSeg), mats.steelSatin);
  bell.rotation.x = Math.PI / 2;
  register("bell", "Dual-Sided Bell", bell, [-28, -42, 6], [-18, -12, -22], 0.2);

  // 2. Brushed radial diaphragm membrane (39 mm)
  const diaphragm = new THREE.Mesh(
    new THREE.CylinderGeometry(19.5, 19.5, 1.2, latheSeg),
    mats.diaphragmFace,
  );
  diaphragm.rotation.x = Math.PI / 2;
  register("diaphragm", "Acoustic Diaphragm", diaphragm, [-28, -42, 13.5], [-10, -4, 34], 0.92);

  // 3. Surgical bold-accent chill-free retaining ring
  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(20.5, 1.5, ringRad, ringSeg),
    mats.accent,
  );
  register("ring", "Retaining Collar", accentRing, [-28, -42, 13], [-12, -5, 44], 1.0);

  // 4. Precision acoustic turret stem & indexed click sleeve
  const stemGroup = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.8, 18, lowDetail ? 14 : 24),
    mats.chromePolished,
  );
  const bayonet = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 3.2, lowDetail ? 14 : 24),
    mats.steelSatin,
  );
  bayonet.position.y = -6.5;
  stemGroup.add(stem, bayonet);
  register("stem", "Acoustic Stem", stemGroup, [-28, -22, 4], [-10, 6, 16], 0.65);

  // 5. Sweeping main acoustic lumen tube
  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-28, -14, 4),
    new THREE.Vector3(-20, 6, 11),
    new THREE.Vector3(6, 20, 8),
    new THREE.Vector3(24, 10, -4),
    new THREE.Vector3(11, -10, -10),
    new THREE.Vector3(0, 18, -2),
  ]);
  const mainTube = new THREE.Mesh(
    new THREE.TubeGeometry(tubeCurve, tubeSeg, 2.75, tubeRad, false),
    mats.tubing,
  );
  register("tube", "Acoustic Lumen", mainTube, [0, 0, 0], [0, -8, -14], 0.35);

  // 6. Machined Y-junction hub with dual strain-relief sleeves
  const yHubGroup = new THREE.Group();
  const yBody = new THREE.Mesh(
    new THREE.CylinderGeometry(4.1, 3.1, 10.5, lowDetail ? 14 : 24),
    mats.tubing,
  );
  const yCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 3.5, lowDetail ? 14 : 24),
    mats.chromePolished,
  );
  yCollar.position.y = -4.2;
  yHubGroup.add(yBody, yCollar);
  register("yhub", "Binaural Y-Hub", yHubGroup, [0, 21, -2], [0, 10, 12], 0.55);

  // 7. Anatomically canted stainless binaural ear tubes + dual-leaf spring tension yoke
  const binauralGroup = new THREE.Group();
  const leftCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, 25, -2),
    new THREE.Vector3(-14, 38, -0.5),
    new THREE.Vector3(-22.5, 55, 4.5),
    new THREE.Vector3(-19.5, 69.5, 11.2),
    new THREE.Vector3(-11.2, 75.5, 16.5),
  ]);
  const rightCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.4, 25, -2),
    new THREE.Vector3(14, 38, -0.5),
    new THREE.Vector3(22.5, 55, 4.5),
    new THREE.Vector3(19.5, 69.5, 11.2),
    new THREE.Vector3(11.2, 75.5, 16.5),
  ]);
  const springOuterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-15, 38.5, -0.5),
    new THREE.Vector3(0, 31.5, -2.5),
    new THREE.Vector3(15, 38.5, -0.5),
  ]);
  const springInnerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-13.5, 40.2, 0.0),
    new THREE.Vector3(0, 34.0, -1.8),
    new THREE.Vector3(13.5, 40.2, 0.0),
  ]);
  const springClip = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 3.2, 2.8),
    mats.chromePolished,
  );
  springClip.position.set(0, 32.8, -2.2);

  // Threaded steel tip ferrules where ear tips lock onto binaurals
  const ferruleGeo = new THREE.CylinderGeometry(2.1, 1.75, 4.2, lowDetail ? 12 : 20);
  const leftFerrule = new THREE.Mesh(ferruleGeo, mats.chromePolished);
  leftFerrule.position.set(-12.2, 74.6, 15.6);
  leftFerrule.rotation.set(0.55, 0.25, -0.86);

  const rightFerrule = new THREE.Mesh(ferruleGeo, mats.chromePolished);
  rightFerrule.position.set(12.2, 74.6, 15.6);
  rightFerrule.rotation.set(0.55, -0.25, 0.86);

  binauralGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(leftCurve, earSeg, 1.65, ringRad, false), mats.steelSatin),
    new THREE.Mesh(new THREE.TubeGeometry(rightCurve, earSeg, 1.65, ringRad, false), mats.steelSatin),
    new THREE.Mesh(new THREE.TubeGeometry(springOuterCurve, lowDetail ? 14 : 26, 0.95, lowDetail ? 8 : 12, false), mats.chromePolished),
    new THREE.Mesh(new THREE.TubeGeometry(springInnerCurve, lowDetail ? 14 : 26, 0.72, lowDetail ? 8 : 10, false), mats.steelSatin),
    springClip,
    leftFerrule,
    rightFerrule,
  );
  register("binaural", "Binaural Headset", binauralGroup, [0, 0, 0], [0, 18, 8], 0.72);

  // 8. Ergonomically angled dual-flange contoured soft-seal acoustic eartips
  const tipsGroup = new THREE.Group();
  const tipGeo = eartipProfile(lowDetail ? 18 : 32);
  const leftTip = new THREE.Mesh(tipGeo, mats.tubing);
  leftTip.position.set(-10.2, 76.2, 17.6);
  leftTip.rotation.set(0.52, 0.28, -0.88);
  const rightTip = new THREE.Mesh(tipGeo, mats.tubing);
  rightTip.position.set(10.2, 76.2, 17.6);
  rightTip.rotation.set(0.52, -0.28, 0.88);
  tipsGroup.add(leftTip, rightTip);
  register("eartips", "Soft-Seal Eartips", tipsGroup, [0, 0, 0], [0, 28, 16], 0.88);

  return { root, parts, accentRing };
}
