import * as THREE from "three";
import { buildAllShapes } from "./shapes.ts";

/**
 * One GPU-resident particle swarm. All five shape targets live as vertex
 * attributes; the vertex shader blends between two of them (uShapeA→uShapeB)
 * with per-particle stagger, curl-noise turbulence during transit, cursor
 * repulsion and click shockwaves. Stateless = deterministic = unkillable.
 */

const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
vec3 curl(vec3 p){
  const float e = 0.1;
  float n1 = snoise(vec3(p.x, p.y + e, p.z));
  float n2 = snoise(vec3(p.x, p.y - e, p.z));
  float n3 = snoise(vec3(p.x, p.y, p.z + e));
  float n4 = snoise(vec3(p.x, p.y, p.z - e));
  float n5 = snoise(vec3(p.x + e, p.y, p.z));
  float n6 = snoise(vec3(p.x - e, p.y, p.z));
  float x = (n1 - n2) - (n3 - n4);
  float y = (n3 - n4) - (n5 - n6);
  float z = (n5 - n6) - (n1 - n2);
  return normalize(vec3(x, y, z) + 1e-6);
}
`;

const VERT = /* glsl */ `
attribute vec4 aShape0;
attribute vec4 aShape1;
attribute vec4 aShape2;
attribute vec4 aShape3;
attribute vec4 aShape4;
attribute vec4 aRand;

uniform float uTime;
uniform float uShapeA;
uniform float uShapeB;
uniform float uProgress;
uniform vec3 uMouse;
uniform float uMouseActive;
uniform vec3 uBurst;
uniform float uBurstTime;
uniform float uActiveCluster;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vAlpha;

${SIMPLEX}

vec4 pick(float idx){
  if (idx < 0.5) return aShape0;
  if (idx < 1.5) return aShape1;
  if (idx < 2.5) return aShape2;
  if (idx < 3.5) return aShape3;
  return aShape4;
}
float shapeWeight(float s, float pr){
  return (abs(uShapeA - s) < 0.5 ? (1.0 - pr) : 0.0) + (abs(uShapeB - s) < 0.5 ? pr : 0.0);
}

const vec3 INDIGO = vec3(0.506, 0.553, 0.973);
const vec3 VIOLET = vec3(0.753, 0.518, 0.988);
const vec3 CYAN   = vec3(0.404, 0.910, 0.976);
const vec3 WHITE  = vec3(1.0, 0.98, 1.0);

void main(){
  vec4 A = pick(uShapeA);
  vec4 B = pick(uShapeB);

  // staggered, eased per-particle progress → morphs ripple across the swarm
  float pr = clamp((uProgress - aRand.x * 0.3) / 0.7, 0.0, 1.0);
  pr = pr * pr * (3.0 - 2.0 * pr);

  vec3 pos = mix(A.xyz, B.xyz, pr);
  float meta = mix(A.w, B.w, pr);

  // transit turbulence — the starling-flock moment
  float transit = pr * (1.0 - pr) * 4.0;
  if (transit > 0.001) {
    pos += curl(pos * 0.85 + uTime * 0.11 + aRand.y * 3.0) * transit * (0.4 + aRand.z * 0.25);
  }

  // idle life: slow drift + breathing
  pos += curl(pos * 0.5 + uTime * 0.022) * 0.028;
  pos += pos * sin(uTime * 0.5 + aRand.y * 6.2831) * 0.006;

  // satellites: active cluster leans toward camera, orbits slowly spin
  float wSat = shapeWeight(3.0, pr);
  if (wSat > 0.01) {
    float cl = mix(A.w, B.w, step(0.5, pr)); // keep id crisp
    float spin = uTime * (0.07 + cl * 0.015);
    float cs = cos(spin), sn = sin(spin);
    // gentle whole-arc sway
    pos.x += sin(uTime * 0.3 + cl * 1.3) * 0.02 * wSat;
    pos.y += cs * 0.015 * wSat;
    if (abs(cl - uActiveCluster) < 0.5) {
      pos.z += 0.55 * wSat;
      pos *= 1.0 + 0.05 * wSat * sin(uTime * 1.2 + sn);
    }
  }

  // cursor repulsion — scatter like fish, spring home for free (stateless)
  if (uMouseActive > 0.5) {
    vec3 dm = pos - uMouse;
    float d = length(dm);
    float force = smoothstep(0.55, 0.0, d);
    pos += normalize(dm + 1e-4) * force * 0.38;
  }

  // click shockwave — expanding ripple band
  float age = uTime - uBurstTime;
  if (age < 1.6 && age > 0.0) {
    vec3 db = pos - uBurst;
    float d = length(db);
    float wave = age * 2.4;
    float band = exp(-pow((d - wave) * 5.0, 2.0));
    pos += normalize(db + 1e-4) * band * 0.5 * (1.0 - age / 1.6);
  }

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // ── color & brightness ──
  float bright = 1.0;
  float wGlobe = shapeWeight(2.0, pr);
  if (wGlobe > 0.01) {
    float gw = meta;
    float beacon = step(2.0, gw) * (0.8 + 0.6 * sin(uTime * 1.8)); // Bengaluru pulses
    bright = mix(bright, 0.25 + gw * 0.85 + beacon, wGlobe);
  }
  float wBrain = shapeWeight(0.0, pr);
  if (wBrain > 0.01) bright = mix(bright, meta, wBrain); // dim interior matter
  float wNeuron = shapeWeight(1.0, pr);
  if (wNeuron > 0.01) {
    // signals climbing the dendrites
    float pulse = smoothstep(0.92, 1.0, sin(meta * 6.0 - uTime * 1.3) * 0.5 + 0.5);
    bright = mix(bright, 0.55 + meta * 0.45 + pulse * 1.0, wNeuron);
  }
  if (wSat > 0.01) {
    float cl = mix(A.w, B.w, step(0.5, pr));
    float on = abs(cl - uActiveCluster) < 0.5 ? 1.85 : 0.62;
    bright = mix(bright, on, wSat);
  }

  vec3 base = mix(INDIGO, VIOLET, aRand.y);
  base = mix(base, CYAN, step(0.86, aRand.z) * 0.9);     // cyan sprinkles
  base = mix(base, WHITE, step(0.985, aRand.w));          // rare white-hot stars
  base = mix(base, CYAN, transit * 0.35);                 // morphs flash cyan
  vColor = base * bright;

  float twinkle = 0.8 + 0.2 * sin(uTime * (0.8 + aRand.w * 1.1) + aRand.x * 40.0);
  float size = (0.9 + aRand.w * 1.4) * 2.2 * twinkle * (0.8 + bright * 0.25);
  gl_PointSize = size * uPixelRatio * (3.4 / max(0.4, -mv.z));
  vAlpha = (0.5 + 0.5 * twinkle) * min(1.0, bright) * 0.43;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d);
  core = pow(core, 1.8);
  gl_FragColor = vec4(vColor, vAlpha * core);
}
`;

export interface MorphState {
  shapeA: number;
  shapeB: number;
  progress: number;
  activeCluster: number;
}

export class ParticleSwarm {
  readonly points: THREE.Points;
  private readonly mat: THREE.ShaderMaterial;
  private mouseTarget = new THREE.Vector3(0, 0, 0);
  private mouseSmooth = new THREE.Vector3(0, 0, 0);

  constructor(count: number, pixelRatio: number) {
    const shapes = buildAllShapes(count);
    const geo = new THREE.BufferGeometry();
    // dummy position attr (three requires it) — real positions come from shape attrs
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    shapes.forEach((arr, idx) => {
      geo.setAttribute(`aShape${idx}`, new THREE.Float32BufferAttribute(arr, 4));
    });
    const rands = new Float32Array(count * 4);
    let s = 8675309;
    const rng = () => {
      s = (Math.imul(s, 48271) >>> 0) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < count * 4; i++) rands[i] = rng();
    geo.setAttribute("aRand", new THREE.Float32BufferAttribute(rands, 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uShapeA: { value: 0 },
        uShapeB: { value: 0 },
        uProgress: { value: 0 },
        uMouse: { value: new THREE.Vector3(99, 99, 99) },
        uMouseActive: { value: 0 },
        uBurst: { value: new THREE.Vector3() },
        uBurstTime: { value: -10 },
        uActiveCluster: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
    });

    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
  }

  setMouse(world: THREE.Vector3 | null): void {
    if (world) {
      this.mouseTarget.copy(world);
      this.mat.uniforms.uMouseActive.value = 1;
    } else {
      this.mat.uniforms.uMouseActive.value = 0;
    }
  }

  burst(world: THREE.Vector3, time: number): void {
    (this.mat.uniforms.uBurst.value as THREE.Vector3).copy(world);
    this.mat.uniforms.uBurstTime.value = time;
  }

  update(time: number, morph: MorphState): void {
    const u = this.mat.uniforms;
    u.uTime.value = time;
    u.uShapeA.value = morph.shapeA;
    u.uShapeB.value = morph.shapeB;
    u.uProgress.value = morph.progress;
    u.uActiveCluster.value = morph.activeCluster;
    this.mouseSmooth.lerp(this.mouseTarget, 0.12);
    (u.uMouse.value as THREE.Vector3).copy(this.mouseSmooth);
  }
}
