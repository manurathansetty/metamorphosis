/**
 * Procedural point-cloud targets for the metamorphosis.
 * Every shape returns Float32Array(count * 4): xyz position + w meta.
 * Meta semantics: brain/neurons/name → brightness (1); globe → 0.35 sea,
 * 1 land, 2.5 Bengaluru pulse; satellites → cluster id 0..4.
 */

const TAU = Math.PI * 2;

function rand(seedRef: { s: number }): number {
  // mulberry32 — deterministic so the swarm is identical every visit
  seedRef.s |= 0;
  seedRef.s = (seedRef.s + 0x6d2b79f5) | 0;
  let t = Math.imul(seedRef.s ^ (seedRef.s >>> 15), 1 | seedRef.s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** cheap value noise on a sphere direction, 3 octaves */
function fbm(x: number, y: number, z: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1.4;
  for (let o = 0; o < 3; o++) {
    v += amp * Math.sin(x * 2.1 * f + 1.7 * o) * Math.cos(y * 2.3 * f - 1.1 * o) * Math.sin(z * 1.9 * f + 0.5 + o);
    amp *= 0.55;
    f *= 2.13;
  }
  return v;
}

/* ── 0 · BRAIN — noise-wrinkled twin-hemisphere ellipsoid ───────── */
export function brain(count: number): Float32Array {
  const out = new Float32Array(count * 4);
  const seed = { s: 1337 };
  for (let i = 0; i < count; i++) {
    // gaussian-ish point on unit sphere
    let x = rand(seed) * 2 - 1, y = rand(seed) * 2 - 1, z = rand(seed) * 2 - 1;
    const l = Math.hypot(x, y, z) || 1;
    x /= l; y /= l; z /= l;

    // cortical folds: radial wrinkle along the surface
    const wr = 0.085 * Math.sin(10 * Math.atan2(z, x) + 6 * y) + 0.07 * fbm(x * 2.2, y * 2.2, z * 2.2);
    let r = 1 + wr;
    // a little interior matter so the brain isn't a hollow shell
    let interior = 1.0;
    if (rand(seed) < 0.12) { r *= 0.55 + rand(seed) * 0.4; interior = 0.55; }

    let px = x * r * 0.95;
    let py = y * r * 0.72;
    let pz = z * r * 1.18;

    // longitudinal fissure — split the hemispheres
    px += Math.sign(px) * 0.055;
    // flatten the underside slightly (no spinal stem, stylized)
    if (py < -0.45) py *= 0.82;

    const o = i * 4;
    out[o] = px; out[o + 1] = py + 0.05; out[o + 2] = pz;
    out[o + 3] = interior;
  }
  return out;
}

/* ── 1 · NEURON TREE — recursive luminous dendrites ─────────────── */
export function neurons(count: number): Float32Array {
  const out = new Float32Array(count * 4);
  const seed = { s: 4242 };
  type Seg = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; w: number };
  const segs: Seg[] = [];

  function grow(x: number, y: number, z: number, dx: number, dy: number, dz: number, len: number, depth: number, w: number) {
    if (depth === 0) return;
    const bx = x + dx * len, by = y + dy * len, bz = z + dz * len;
    segs.push({ ax: x, ay: y, az: z, bx, by, bz, w });
    const kids = depth > 4 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const spread = 0.55 + rand(seed) * 0.5;
      let ndx = dx + (rand(seed) - 0.5) * spread;
      let ndy = dy + (rand(seed) - 0.35) * spread; // bias upward
      let ndz = dz + (rand(seed) - 0.5) * spread;
      const nl = Math.hypot(ndx, ndy, ndz) || 1;
      ndx /= nl; ndy /= nl; ndz /= nl;
      grow(bx, by, bz, ndx, ndy, ndz, len * (0.62 + rand(seed) * 0.16), depth - 1, w * 0.72);
    }
  }
  grow(0, -1.35, 0, 0, 1, 0, 0.62, 6, 0.085);

  const totalLen = segs.reduce((s, g) => s + Math.hypot(g.bx - g.ax, g.by - g.ay, g.bz - g.az), 0);
  let i = 0;
  for (const g of segs) {
    const segLen = Math.hypot(g.bx - g.ax, g.by - g.ay, g.bz - g.az);
    const n = Math.max(2, Math.round((segLen / totalLen) * count * 0.92));
    for (let k = 0; k < n && i < count; k++, i++) {
      const t = rand(seed);
      const jit = g.w * (rand(seed) + rand(seed) - 1);
      const o = i * 4;
      out[o] = g.ax + (g.bx - g.ax) * t + jit * (rand(seed) - 0.5) * 2;
      out[o + 1] = g.ay + (g.by - g.ay) * t + jit * (rand(seed) - 0.5) * 2;
      out[o + 2] = g.az + (g.bz - g.az) * t + jit * (rand(seed) - 0.5) * 2;
      out[o + 3] = 0.8 + t * 0.4;
    }
  }
  // leftovers → glowing synapse blooms at branch tips
  const tips = segs.filter((s) => s.w < 0.03);
  while (i < count) {
    const tip = tips[Math.floor(rand(seed) * tips.length)] ?? segs[segs.length - 1];
    const o = i * 4;
    const rr = 0.05 * rand(seed);
    out[o] = tip.bx + (rand(seed) - 0.5) * rr * 2;
    out[o + 1] = tip.by + (rand(seed) - 0.5) * rr * 2;
    out[o + 2] = tip.bz + (rand(seed) - 0.5) * rr * 2;
    out[o + 3] = 1.8; // bright blooms
    i++;
  }
  // recentre vertically
  for (let k = 0; k < count; k++) out[k * 4 + 1] -= 0.15;
  return out;
}

/* ── 2 · GLOBE — fibonacci sphere, fbm landmasses, Bengaluru ────── */
export function globe(count: number): Float32Array {
  const out = new Float32Array(count * 4);
  const seed = { s: 9001 };
  const R = 1.12;
  // Bengaluru: lat 12.97 N, lon 77.59 E
  const lat = (12.97 * Math.PI) / 180;
  const lon = (77.59 * Math.PI) / 180;
  const bx = Math.cos(lat) * Math.cos(lon), by = Math.sin(lat), bz = -Math.cos(lat) * Math.sin(lon);

  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const y = 1 - t * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th = phi * i;
    const x = Math.cos(th) * rad, z = Math.sin(th) * rad;

    const o = i * 4;
    out[o] = x * R; out[o + 1] = y * R; out[o + 2] = z * R;

    const land = fbm(x * 1.6, y * 1.6, z * 1.6) > 0.04;
    let w = land ? 1.0 : 0.3;
    const dot = x * bx + y * by + z * bz;
    if (dot > 0.9985) w = 2.5; // Bengaluru beacon
    else if (dot > 0.995) w = 1.6; // halo
    out[o + 3] = w + rand(seed) * 0.001; // tiny jitter avoids banding
  }
  return out;
}

/* ── 3 · SATELLITES — four project orbs in a wide arc ───────────── */
export function satellites(count: number): Float32Array {
  const out = new Float32Array(count * 4);
  const seed = { s: 777 };
  const CLUSTERS = 4;
  // arc across the upper half, mild depth variance
  const centers: Array<[number, number, number, number]> = [];
  for (let c = 0; c < CLUSTERS; c++) {
    const a = (-0.5 + c / (CLUSTERS - 1)) * Math.PI * 0.92;
    centers.push([Math.sin(a) * 2.1, Math.cos(a) * 0.35 + 0.55, -0.2 + 0.18 * Math.sin(c * 2.4), 0.21 + 0.05 * ((c * 7919) % 3)]);
  }
  for (let i = 0; i < count; i++) {
    const c = i % CLUSTERS;
    const [cx, cy, cz, cr] = centers[c];
    const o = i * 4;
    if (rand(seed) < 0.18) {
      // orbit ring particle
      const ang = rand(seed) * TAU;
      const rr = cr * (1.7 + rand(seed) * 0.5);
      const tilt = 0.45 + c * 0.21;
      out[o] = cx + Math.cos(ang) * rr;
      out[o + 1] = cy + Math.sin(ang) * rr * Math.sin(tilt);
      out[o + 2] = cz + Math.sin(ang) * rr * Math.cos(tilt) * 0.6;
    } else {
      // gaussian core
      let gx = 0, gy = 0, gz = 0;
      for (let k = 0; k < 3; k++) { gx += rand(seed) - 0.5; gy += rand(seed) - 0.5; gz += rand(seed) - 0.5; }
      out[o] = cx + gx * cr * 1.3;
      out[o + 1] = cy + gy * cr * 1.3;
      out[o + 2] = cz + gz * cr * 1.3;
    }
    out[o + 3] = c; // cluster id
  }
  return out;
}

/* ── 4 · NAME — "MANU" rasterised to particles ──────────────────── */
export function nameShape(count: number): Float32Array {
  const out = new Float32Array(count * 4);
  const seed = { s: 31415 };
  const cw = 1024, ch = 384;
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 270px 'Clash Display', 'Arial Black', sans-serif";
  ctx.fillText("MANU", cw / 2, ch / 2 + 10);
  const px = ctx.getImageData(0, 0, cw, ch).data;

  const aspect = cw / ch;
  const W = 2.9, H = W / aspect;
  let placed = 0, guard = 0;
  while (placed < count && guard < count * 400) {
    guard++;
    const u = rand(seed), v = rand(seed);
    const ix = Math.floor(u * cw), iy = Math.floor(v * ch);
    if (px[(iy * cw + ix) * 4 + 3] > 128) {
      const o = placed * 4;
      out[o] = (u - 0.5) * W;
      out[o + 1] = (0.5 - v) * H;
      out[o + 2] = (rand(seed) - 0.5) * 0.14;
      out[o + 3] = 1.1;
      placed++;
    }
  }
  // safety: if the font produced nothing (canvas blocked), fall back to a ring
  for (; placed < count; placed++) {
    const a = rand(seed) * TAU;
    const o = placed * 4;
    out[o] = Math.cos(a) * 1.2; out[o + 1] = Math.sin(a) * 0.5; out[o + 2] = 0;
    out[o + 3] = 1.0;
  }
  return out;
}

export function buildAllShapes(count: number): Float32Array[] {
  return [brain(count), neurons(count), globe(count), satellites(count), nameShape(count)];
}
