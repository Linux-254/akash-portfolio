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
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();

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
  private pointerCurrentX = 0;
  private pointerCurrentY = 0;
  private envRotX = 0;
  private envRotY = 0;
  private holdAmount = 0;
  private pulseBoost = 0;
  private routeMode = "/";
  private viewportW = 1280;
  private viewportH = 800;
  private shotCurrent: CueShot = {
    frame: 150,
    polar: 12,
    azimuth: 16,
    offsetX: 0.0,
    offsetY: 0.0,
    explode: 0,
    timeScale: 1,
    scaleMul: 0.98,
  };
  private lowFpsAccum = 0;
  private qualityStep = 0;
  private disposed = false;
  private unsubTheme: () => void;
  private resizeObserver: ResizeObserver | null = null;

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

    this.viewportW = Math.max(window.innerWidth, 1);
    this.viewportH = Math.max(window.innerHeight, 1);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75),
    );
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(this.viewportW, this.viewportH, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      36,
      this.viewportW / this.viewportH,
      0.1,
      100,
    );

    const lowDetail = this.viewportW <= 768;
    const theme = getActiveTheme();
    this.scene.environment = buildStudioEnvironment(this.renderer, theme);
    this.mats = createStethoscopeMaterials(theme);
    this.assembly = buildStethoscopeParts(this.mats, lowDetail);
    this.assembly.root.position.set(0, 0, 0);
    this.assembly.root.scale.setScalar(0.02 * 0.98);
    this.assembly.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.frustumCulled = false;
      }
    });
    this.scene.add(this.assembly.root);

    this.routeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.008, lowDetail ? 8 : 12, lowDetail ? 48 : 96),
      this.mats.accent,
    );
    this.routeRing.visible = false;
    this.routeRing.frustumCulled = false;
    this.scene.add(this.routeRing);

    this.unsubTheme = subscribeTheme((t) => this.applyTheme(t));
    window.addEventListener("resize", this.onResize);
    window.visualViewport?.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(document.documentElement);
    }

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
    const parent = this.domElement.parentElement;
    const w = Math.max(parent?.clientWidth || window.innerWidth, 1);
    const h = Math.max(parent?.clientHeight || window.innerHeight, 1);
    this.viewportW = w;
    this.viewportH = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(
      this.isSoftwareGl || this.qualityStep === 1
        ? 1
        : Math.min(window.devicePixelRatio, 1.75),
    );
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
    const rawDt = Math.min(Math.max((now - this.lastTime) / 1000, 0.001), 0.033);
    this.lastTime = now;

    if (!this.isSoftwareGl && rawDt > 0.03) {
      this.lowFpsAccum += rawDt;
      if (this.lowFpsAccum > 3.0 && this.qualityStep === 0) {
        this.qualityStep = 1;
        this.renderer.setPixelRatio(1);
      }
    } else {
      this.lowFpsAccum = 0;
    }

    // Silky frame-rate independent exponential damping across pointer, scroll & gimbal axes
    this.scrollCurrent = THREE.MathUtils.damp(this.scrollCurrent, this.scrollTarget, 4.4, rawDt);
    this.pointerCurrentX = THREE.MathUtils.damp(this.pointerCurrentX, this.pointerX, 3.6, rawDt);
    this.pointerCurrentY = THREE.MathUtils.damp(this.pointerCurrentY, this.pointerY, 3.6, rawDt);
    this.envRotX = THREE.MathUtils.damp(this.envRotX, this.pointerCurrentY * 0.42, 4.2, rawDt);
    this.envRotY = THREE.MathUtils.damp(this.envRotY, -this.pointerCurrentX * 0.72, 4.2, rawDt);

    const targetCue = sampleCues(this.routeMode, this.scrollCurrent);
    this.shotCurrent.frame = THREE.MathUtils.damp(this.shotCurrent.frame, targetCue.frame, 3.6, rawDt);
    this.shotCurrent.polar = THREE.MathUtils.damp(this.shotCurrent.polar, targetCue.polar, 3.5, rawDt);
    this.shotCurrent.azimuth = THREE.MathUtils.damp(this.shotCurrent.azimuth, targetCue.azimuth, 3.5, rawDt);
    this.shotCurrent.offsetX = THREE.MathUtils.damp(this.shotCurrent.offsetX, targetCue.offsetX, 3.8, rawDt);
    this.shotCurrent.offsetY = THREE.MathUtils.damp(this.shotCurrent.offsetY, targetCue.offsetY, 3.8, rawDt);
    this.shotCurrent.explode = THREE.MathUtils.damp(this.shotCurrent.explode, targetCue.explode, 4.0, rawDt);
    this.shotCurrent.timeScale = THREE.MathUtils.damp(this.shotCurrent.timeScale, targetCue.timeScale, 3.2, rawDt);
    this.shotCurrent.scaleMul = THREE.MathUtils.damp(this.shotCurrent.scaleMul, targetCue.scaleMul, 3.8, rawDt);

    this.clock.timeScale = this.shotCurrent.timeScale;
    const simTime = this.clock.step(rawDt);
    this.pulseBoost *= Math.exp(-3.2 * rawDt);

    const pulse = this.clock.pulse(this.holdAmount, this.pulseBoost);
    this.mats.accent.emissiveIntensity = 0.16 + pulse * 1.45;
    const ringScale = 1 + pulse * 0.065;
    this.assembly.accentRing.scale.set(ringScale, ringScale, 1);

    applyExplode(this.assembly.parts, this.shotCurrent.explode);

    const isMobile = this.viewportW <= 768;
    const pointerScale = isMobile ? 0.35 : 0.85;
    const dist = frameToDistance(
      this.shotCurrent.frame,
      this.camera.fov,
      this.camera.aspect,
      this.shotCurrent.explode,
    );
    const polarRad = THREE.MathUtils.degToRad(this.shotCurrent.polar);
    const swayAz =
      Math.sin(simTime * 0.38) * 0.055 + Math.sin(simTime * 0.17) * 0.025;
    const azRad =
      THREE.MathUtils.degToRad(this.shotCurrent.azimuth) +
      this.pointerCurrentX * 0.18 * pointerScale +
      swayAz;

    const targetY = 0.08 + Math.sin(simTime * 0.42) * 0.014;
    this.camera.position.set(
      Math.sin(azRad) * Math.cos(polarRad) * dist,
      targetY +
        Math.sin(polarRad) * dist * 0.55 -
        this.pointerCurrentY * 0.22 * pointerScale,
      Math.cos(azRad) * Math.cos(polarRad) * dist,
    );
    this.camera.lookAt(0, targetY, 0);
    this.camera.updateMatrixWorld();

    _camRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    _camUp.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();

    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * dist;
    const viewWidth = viewHeight * this.camera.aspect;

    const scaleFactor = this.shotCurrent.scaleMul * (1 + this.holdAmount * 0.05);
    const explodeExpand = 1 + Math.max(0, this.shotCurrent.explode) * 0.38;

    // Exact world-space stethoscope half-extents at current scale & explosion
    const modelHalfW = 1.18 * scaleFactor * explodeExpand;
    const modelHalfH = 1.65 * scaleFactor * explodeExpand;

    // Safe travel envelope keeping the full stethoscope cleanly inside responsive viewport borders
    const maxSafeOx = Math.max(0, viewWidth * 0.44 - modelHalfW);
    const maxSafeOy = Math.max(0, viewHeight * 0.42 - modelHalfH);

    // Smooth figure-8 drift that activates purely from scrolling and returns to 0 at start & end
    const scrollProgress = THREE.MathUtils.clamp(this.scrollCurrent / 2, 0, 1);
    const scrollEnvelope = Math.sin(scrollProgress * Math.PI);
    const roamX = Math.sin(scrollProgress * Math.PI * 2) * 0.08 * scrollEnvelope;
    const roamY = Math.sin(scrollProgress * Math.PI * 3) * 0.04 * scrollEnvelope;

    const desiredOx = (this.shotCurrent.offsetX + roamX * scrollEnvelope) * viewWidth;
    const desiredOy = (this.shotCurrent.offsetY + roamY * scrollEnvelope) * viewHeight;

    const ox = THREE.MathUtils.clamp(desiredOx, -maxSafeOx, maxSafeOx);
    const oy = THREE.MathUtils.clamp(desiredOy, -maxSafeOy, maxSafeOy);

    this.assembly.root.position
      .set(0.06 * scaleFactor, targetY - 0.16 * scaleFactor, 0)
      .addScaledVector(_camRight, ox)
      .addScaledVector(_camUp, oy);

    this.assembly.root.rotation.set(
      Math.cos(simTime * 0.27) * 0.02,
      Math.sin(simTime * 0.21) * 0.025,
      Math.sin(simTime * 0.34) * 0.028,
    );

    const s = 0.02 * scaleFactor;
    this.assembly.root.scale.copy(_scaleVec.set(s, s, s));

    this.scene.environmentRotation.set(this.envRotX, this.envRotY, 0);

    if (this.routeRing.visible) {
      this.routeRing.position.copy(this.assembly.root.position);
      this.routeRing.position.y += 0.16 * scaleFactor;
      const rScale = Math.max(0.68, scaleFactor);
      this.routeRing.scale.setScalar(rScale);
      this.routeRing.rotation.x = 1.15 + Math.sin(simTime * 0.55) * 0.16;
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
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.onResize);
    window.visualViewport?.removeEventListener("resize", this.onResize);
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
