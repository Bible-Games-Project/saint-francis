import * as THREE from "three";

/**
 * Owns the renderer, camera and render loop. Scenes register themselves and
 * get ticked every frame; this class knows nothing about menus or game
 * state, only how to draw.
 */
export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;

  private updaters: Array<(dt: number, elapsed: number) => void> = [];
  private clock = new THREE.Clock();
  private frameId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 500);
    this.scene = new THREE.Scene();

    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  private handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  addUpdater(fn: (dt: number, elapsed: number) => void): () => void {
    this.updaters.push(fn);
    return () => {
      this.updaters = this.updaters.filter((u) => u !== fn);
    };
  }

  start(): void {
    const loop = () => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.elapsedTime;
      for (const fn of this.updaters) fn(dt, elapsed);
      this.renderer.render(this.scene, this.camera);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
  }
}
