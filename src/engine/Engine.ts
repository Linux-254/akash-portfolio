import * as THREE from "three";
import { getActiveTheme, subscribeTheme, ThemeConfig } from "@/theme.config";
import { createStethoscopeMaterials, StethoscopeMaterials } from "./materials";
import { buildStethoscopeParts, StethoscopeAssembly } from "./parts";
import { buildStudioEnvironment } from "./studio";
import { CueShot, frameToDistance, sampleCues } from "./cues";
import { applyExplode } from "./explode";
import { SimulationClock } from "./clock";

function detectSoftwareGl(): boolean {
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2");
  if (!gl) return true;
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

const _scaleVec = new THREE.Vector3();

export class Engine {
  public readonly domElement: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mats: StethoscopeMaterials;
  private assembly: StethoscopeAssembly;
  private routeRing: THREE.Mesh;
  private clock = new SimulationClock();
  private isSoftwareGl: boolean;
  private frameId = 0;
  private lastTime = performance.now();
  private scrollTarget = 0;
  private scrollCurrent = 0;
  private pointerX = 0;
  private pointerY = 0;
  private envRotX = 0;
  private envRotY = 0;
  private holdAmount = 0;
  private pulseBoost = 0;
  private routeMode = "/";
  private shotCurrent: CueShot = {
    frame: 132,
    polar: 12,
    azimuth: 16,
    offsetX: 0.16,
    offsetY: 0.02,
    explode: 0,
    timeScale: 1,
    scaleMul: 1.05,
  };
  private lowFpsAccum = 0;
  private qualityStep = 0;
  private disposed = false;
  private unsubTheme: () => void;

  constructor() {
    this.isSoftwareGl = detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !this.isSoftwareGl,
      powerPreference: "high-performance",
    });
    this.domElement = this.renderer.domElement;
    this.domElement.className = "engine-canvas";
    this.domElement.setAttribute("aria-hidden", "true");

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75),
    );
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      36,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );

    const lowDetail = window.innerWidth <= 768;
    const theme = getActiveTheme();
    this.scene.environment = buildStudioEnvironment(this.renderer, theme);
    this.mats = createStethoscopeMaterials(theme);
    this.assembly = buildStethoscopeParts(this.mats, lowDetail);
    this.assembly.root.position.set(3.8, -0.4, -3.5);
    this.assembly.root.scale.setScalar(0.014);
    this.scene.add(this.assembly.root);

    this.routeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.008, lowDetail ? 8 : 12, lowDetail ? 48 : 96),
      this.mats.accent,
    );
    this.routeRing.visible = false;
    this.scene.add(this.routeRing);

    this.unsubTheme = subscribeTheme((t) => this.applyTheme(t));
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.tick();
  }

  private applyTheme(t: ThemeConfig): void {
    this.mats.accent.color.set(t.colors.bold);
    this.mats.accent.emissive.set(t.colors.bold);
    this.scene.environment?.dispose();
    this.scene.environment = buildStudioEnvironment(this.renderer, t);
  }

  setScrollProgress(p: number): void {
    this.scrollTarget = p;
  }

  setPointer(nx: number, ny: number): void {
    this.pointerX = nx;
    this.pointerY = ny;
  }

  setHoldAmount(v: number): void {
    this.holdAmount = THREE.MathUtils.clamp(v, 0, 1);
  }

  triggerLockNorth(): void {
    this.pulseBoost = 1;
  }

  setRoute(pathname: string): void {
    this.routeMode = pathname;
    this.routeRing.visible = pathname === "/leadership" || pathname === "/contact";
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private onVisibility = (): void => {
    if (!document.hidden && !this.disposed) {
      this.lastTime = performance.now();
      this.scheduleNext();
    }
  };

  private scheduleNext(): void {
    if (this.disposed || document.hidden) return;
    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(this.tick, 80);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    if (this.disposed || document.hidden) return;
    const now = performance.now();
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.isSoftwareGl && rawDt > 0.025) {
      this.lowFpsAccum += rawDt;
      if (this.lowFpsAccum > 2 && this.qualityStep === 0) {
        this.qualityStep = 1;
        this.renderer.setPixelRatio(1);
      }
    } else {
      this.lowFpsAccum = 0;
    }

    const k = 1 - Math.exp(-6 * rawDt);
    this.scrollCurrent += (this.scrollTarget - this.scrollCurrent) * k;
    this.envRotX += (this.pointerY * 0.45 - this.envRotX) * k;
    this.envRotY += (-this.pointerX * 0.8 - this.envRotY) * k;

    const targetCue = sampleCues(this.routeMode, this.scrollCurrent);
    this.shotCurrent.frame += (targetCue.frame - this.shotCurrent.frame) * k;
    this.shotCurrent.polar += (targetCue.polar - this.shotCurrent.polar) * k;
    this.shotCurrent.azimuth += (targetCue.azimuth - this.shotCurrent.azimuth) * k;
    this.shotCurrent.offsetX += (targetCue.offsetX - this.shotCurrent.offsetX) * k;
    this.shotCurrent.offsetY += (targetCue.offsetY - this.shotCurrent.offsetY) * k;
    this.shotCurrent.explode += (targetCue.explode - this.shotCurrent.explode) * k;
    this.shotCurrent.timeScale += (targetCue.timeScale - this.shotCurrent.timeScale) * k;
    this.shotCurrent.scaleMul += (targetCue.scaleMul - this.shotCurrent.scaleMul) * k;

    this.clock.timeScale = this.shotCurrent.timeScale;
    const simTime = this.clock.step(rawDt);
    this.pulseBoost *= Math.exp(-3.2 * rawDt);

    const pulse = this.clock.pulse(this.holdAmount, this.pulseBoost);
    this.mats.accent.emissiveIntensity = 0.16 + pulse * 1.45;
    const ringScale = 1 + pulse * 0.07;
    this.assembly.accentRing.scale.set(ringScale, ringScale, 1);

    applyExplode(this.assembly.parts, this.shotCurrent.explode);

    const isMobile = window.innerWidth <= 768;
    const pointerScale = isMobile ? 0.45 : 1;
    const dist = frameToDistance(this.shotCurrent.frame, this.camera.fov, this.camera.aspect);
    const polarRad = THREE.MathUtils.degToRad(this.shotCurrent.polar);
    const azRad =
      THREE.MathUtils.degToRad(this.shotCurrent.azimuth) +
      this.pointerX * 0.18 * pointerScale +
      Math.sin(simTime * 0.45) * 0.06;

    this.camera.position.set(
      Math.sin(azRad) * Math.cos(polarRad) * dist,
      Math.sin(polarRad) * dist * 0.6 - this.pointerY * 0.25 * pointerScale,
      Math.cos(azRad) * Math.cos(polarRad) * dist,
    );
    this.camera.lookAt(0, 0.1, 0);

    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * dist;
    const viewWidth = viewHeight * this.camera.aspect;
    this.assembly.root.position.x = this.shotCurrent.offsetX * viewWidth * (isMobile ? 0.28 : 1);
    this.assembly.root.position.y = this.shotCurrent.offsetY * viewHeight * (isMobile ? 0.65 : 1);
    const s = 0.02 * this.shotCurrent.scaleMul * (1 + this.holdAmount * 0.05);
    this.assembly.root.scale.lerp(_scaleVec.set(s, s, s), k);

    this.scene.environmentRotation.set(this.envRotX, this.envRotY, 0);

    if (this.routeRing.visible) {
      this.routeRing.position.x = this.assembly.root.position.x;
      this.routeRing.position.y = this.assembly.root.position.y;
      this.routeRing.rotation.x = 1.15 + Math.sin(simTime * 0.6) * 0.18;
      this.routeRing.rotation.z += rawDt * 0.22;
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNext();
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unsubTheme();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
    this.mats.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.domElement.remove();
  }
}
