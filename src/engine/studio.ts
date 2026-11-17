import * as THREE from "three";
import { ThemeConfig } from "@/theme.config";

export function buildStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  theme: ThemeConfig,
): THREE.Texture {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x0b0f11);

  const softboxMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.colors.neutralLight).multiplyScalar(2.6),
  });
  const keySoftbox = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 14),
    softboxMat,
  );
  keySoftbox.position.set(-14, 13, 12);
  keySoftbox.lookAt(0, 0, 0);

  const stripNeutralMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.colors.neutralLight).multiplyScalar(2.1),
  });
  const leftStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 34),
    stripNeutralMat,
  );
  leftStrip.position.set(-18, 0, 4);
  leftStrip.lookAt(0, 0, 0);

  const stripBoldMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(theme.colors.neutralLight)
      .lerp(new THREE.Color(theme.colors.bold), 0.28)
      .multiplyScalar(2.2),
  });
  const rightStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 34),
    stripBoldMat,
  );
  rightStrip.position.set(18, 2, 4);
  rightStrip.lookAt(0, 0, 0);

  studio.add(keySoftbox, leftStrip, rightStrip);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(studio, 0.035).texture;
  pmrem.dispose();

  keySoftbox.geometry.dispose();
  leftStrip.geometry.dispose();
  rightStrip.geometry.dispose();
  softboxMat.dispose();
  stripNeutralMat.dispose();
  stripBoldMat.dispose();

  return envTex;
}
