import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ParticleSwarm, type MorphState } from "./particles.ts";

export class Stage {
  readonly swarm: ParticleSwarm;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly hit = new THREE.Vector3();
  private readonly ndc = new THREE.Vector2();
  private camTargetZ = 3.3;
  private parallax = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement, particleCount: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    const dpr = Math.min(window.devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040308);
    this.scene.fog = new THREE.FogExp2(0x040308, 0.07);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 30);
    this.camera.position.set(0, 0, 3.3);

    this.swarm = new ParticleSwarm(particleCount, dpr);
    this.scene.add(this.swarm.points);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.42, // strength — glow, not floodlight
      0.5,  // radius
      0.16, // threshold
    );
    this.composer.addPass(bloom);

    window.addEventListener("resize", () => this.onResize());

    window.addEventListener("pointermove", (e) => {
      document.body.classList.add("has-mouse");
      this.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.parallax.set(this.ndc.x, this.ndc.y);
      this.raycaster.setFromCamera(this.ndc, this.camera);
      if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) this.swarm.setMouse(this.hit);
      const glow = document.querySelector<HTMLElement>(".cursor-glow");
      if (glow) { glow.style.left = `${e.clientX}px`; glow.style.top = `${e.clientY}px`; }
    });
    window.addEventListener("pointerleave", () => this.swarm.setMouse(null));
    window.addEventListener("pointerdown", (e) => {
      this.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.raycaster.setFromCamera(this.ndc, this.camera);
      if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
        this.swarm.burst(this.hit, this.clock.getElapsedTime());
      }
    });
  }

  private onResize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  /** Camera + swarm placement per timeline position. */
  setZoomForTimeline(t: number): void {
    this.camTargetZ = 3.3 + 1.0 * Math.max(0, 1 - Math.abs(t - 3));
    // keep the swarm clear of left-aligned copy early on, centre it for
    // satellites and the name finale; on small screens stay centred but deep
    const wide = window.innerWidth > 820;
    const keys = wide ? [0.95, 0.6, 0.55, 0, 0] : [0, 0, 0, 0, 0];
    const i = Math.min(keys.length - 2, Math.floor(t));
    this.swarmTargetX = keys[i] + (keys[i + 1] - keys[i]) * (t - i);
  }
  private swarmTargetX = 0.95;

  render(morph: MorphState): void {
    const t = this.clock.getElapsedTime();
    this.swarm.update(t, morph);
    this.swarm.points.position.x += (this.swarmTargetX - this.swarm.points.position.x) * 0.05;
    this.camera.position.z += (this.camTargetZ - this.camera.position.z) * 0.04;
    this.camera.position.x += (this.parallax.x * 0.16 - this.camera.position.x) * 0.03;
    this.camera.position.y += (this.parallax.y * 0.1 - this.camera.position.y) * 0.03;
    this.camera.lookAt(0, 0, 0);
    this.composer.render();
  }
}
