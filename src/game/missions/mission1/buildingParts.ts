import * as THREE from "three";
import { fbm2D } from "../../../scene/utils/noise";
import { makeRng } from "../../../scene/utils/types";

/**
 * Shared low-poly "medieval Assisi" building kit: walls with real cut
 * openings (not a single blind box), beams, plank/stone floors, and a
 * handful of furniture/street props. Used by both the house interior and
 * the exterior street so the two spaces read as one coherent place.
 */

export const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a3324, flatShading: true, roughness: 0.85 });
export const woodMed = new THREE.MeshStandardMaterial({ color: 0x6b4e34, flatShading: true, roughness: 0.82 });
export const ironDark = new THREE.MeshStandardMaterial({ color: 0x2b2620, flatShading: true, roughness: 0.55, metalness: 0.3 });

export function plasterMaterial(base: number, variance = 0.06): THREE.Material {
  return new THREE.MeshStandardMaterial({ color: base, flatShading: true, roughness: 0.95 - variance });
}

/**
 * A straight wall run of `length` (local X) and `height`, optionally with a
 * rectangular opening cut into it (door/window). Built from real segments —
 * left pier, right pier, lintel above the opening — so there is an actual
 * gap, not a texture pretending to be one. Origin is the wall's base
 * centerline; caller positions/rotates the returned group.
 */
export function wallRun(
  length: number,
  height: number,
  thickness: number,
  material: THREE.Material,
  opening?: { center: number; width: number; sill: number; top: number },
): THREE.Group {
  const group = new THREE.Group();
  const addBox = (w: number, h: number, cx: number, cy: number) => {
    if (w <= 0.001 || h <= 0.001) return;
    const geo = new THREE.BoxGeometry(w, h, thickness, Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(h * 2)), 1);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(cx, cy, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  if (!opening || opening.width <= 0) {
    addBox(length, height, 0, height / 2);
    return group;
  }

  const left = opening.center - opening.width / 2;
  const right = opening.center + opening.width / 2;
  const halfLen = length / 2;

  addBox(left - -halfLen, height, (-halfLen + left) / 2, height / 2);
  addBox(halfLen - right, height, (right + halfLen) / 2, height / 2);
  if (opening.sill > 0) addBox(opening.width, opening.sill, opening.center, opening.sill / 2);
  if (opening.top < height) addBox(opening.width, height - opening.top, opening.center, opening.top + (height - opening.top) / 2);

  return group;
}

export function beam(length: number, thickness = 0.12): THREE.Mesh {
  const geo = new THREE.BoxGeometry(thickness, thickness, length, 1, 1, Math.max(1, Math.round(length)));
  const mesh = new THREE.Mesh(geo, woodDark);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A wood-plank floor with gentle per-plank color variation (no texture assets). */
export function plankFloor(width: number, depth: number, baseColor = 0x8a6a48): THREE.Mesh {
  const segX = Math.max(6, Math.round(width * 3));
  const segZ = Math.max(6, Math.round(depth * 2));
  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(baseColor);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const plank = Math.floor((x + width / 2) / 0.42);
    const variation = (plank % 5) * 0.018 - 0.036 + fbm2D(x * 0.6, pos.getZ(i) * 0.6, 2, 2, 0.5, 4) * 0.05;
    c.copy(base).offsetHSL(0, 0, variation);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/** Cobblestone-ish street surface with subtle mottling. */
export function cobbleFloor(width: number, depth: number, baseColor = 0xafa286): THREE.Mesh {
  const segX = Math.max(10, Math.round(width * 2));
  const segZ = Math.max(10, Math.round(depth * 2));
  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(baseColor);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = fbm2D(x * 1.6, z * 1.6, 3, 2, 0.5, 9);
    c.copy(base).offsetHSL(0, -0.02, (n - 0.5) * 0.12);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    pos.setY(i, (n - 0.5) * 0.025);
  }
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export function table(width = 1.3, depth = 0.7, height = 0.78, mat = woodMed): THREE.Group {
  const group = new THREE.Group();
  const topGeo = new THREE.BoxGeometry(width, 0.06, depth);
  const top = new THREE.Mesh(topGeo, mat);
  top.position.y = height;
  group.add(top);
  const legGeo = new THREE.CylinderGeometry(0.035, 0.045, height, 6);
  const inset = 0.1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, woodDark);
      leg.position.set((width / 2 - inset) * sx, height / 2, (depth / 2 - inset) * sz);
      group.add(leg);
    }
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

export function chest(width = 0.7, depth = 0.4, height = 0.42): THREE.Group {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(width, height * 0.72, depth);
  const body = new THREE.Mesh(bodyGeo, woodMed);
  body.position.y = (height * 0.72) / 2;
  group.add(body);

  const lidGeo = new THREE.CylinderGeometry(depth / 2, depth / 2, width, 8, 1, false, 0, Math.PI);
  const lid = new THREE.Mesh(lidGeo, woodDark);
  lid.rotation.z = Math.PI / 2;
  lid.position.y = height * 0.72;
  group.add(lid);

  for (const t of [-width * 0.32, width * 0.32]) {
    const bandGeo = new THREE.BoxGeometry(0.04, height, depth + 0.02);
    const band = new THREE.Mesh(bandGeo, ironDark);
    band.position.set(t, height / 2, 0);
    group.add(band);
  }

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

export function shelfUnit(width = 1.1, height = 1.5, depth = 0.32): THREE.Group {
  const group = new THREE.Group();
  const sideGeo = new THREE.BoxGeometry(0.05, height, depth);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(sideGeo, woodDark);
    side.position.set((width / 2) * sx, height / 2, 0);
    group.add(side);
  }
  const shelfGeo = new THREE.BoxGeometry(width, 0.035, depth);
  const levels = 3;
  for (let i = 0; i < levels; i++) {
    const shelf = new THREE.Mesh(shelfGeo, woodMed);
    shelf.position.y = (height / (levels - 1)) * i * 0.92 + 0.06;
    group.add(shelf);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

export function jar(radius = 0.09, height = 0.2, color = 0xb7ab8f): THREE.Mesh {
  const geo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(radius * 0.5, 0),
      new THREE.Vector2(radius, height * 0.18),
      new THREE.Vector2(radius * 0.95, height * 0.75),
      new THREE.Vector2(radius * 0.55, height),
      new THREE.Vector2(radius * 0.4, height * 1.05),
    ],
    8,
  );
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function clothRoll(length = 0.5, radius = 0.075, color = 0xc07f56): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius, radius, length, 8);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }));
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function hangingCloth(width = 0.7, height = 0.9, color = 0x9c5a42): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, height, 5, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 6 + 1) * 0.025 * (1 - (y + height / 2) / height));
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function barrel(radius = 0.28, height = 0.55): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(radius * 0.86, 0),
      new THREE.Vector2(radius, height * 0.2),
      new THREE.Vector2(radius * 1.04, height * 0.5),
      new THREE.Vector2(radius, height * 0.8),
      new THREE.Vector2(radius * 0.86, height),
    ],
    10,
  );
  const body = new THREE.Mesh(geo, woodMed);
  group.add(body);
  for (const t of [height * 0.22, height * 0.5, height * 0.78]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.01, 0.02, 5, 12), ironDark);
    band.rotation.x = Math.PI / 2;
    band.position.y = t;
    group.add(band);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

export function crate(size = 0.42): THREE.Mesh {
  const geo = new THREE.BoxGeometry(size, size * 0.85, size);
  const mesh = new THREE.Mesh(geo, woodMed);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function basket(radius = 0.22, height = 0.24): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radius * 1.1, radius * 0.8, height, 9, 1, true);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xa88a5c, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function candle(height = 0.14): THREE.Group {
  const group = new THREE.Group();
  const bodyGeo = new THREE.CylinderGeometry(0.016, 0.018, height, 6);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xe8dcb8, flatShading: true, roughness: 0.6 }));
  body.position.y = height / 2;
  group.add(body);
  const flameGeo = new THREE.ConeGeometry(0.012, 0.03, 6);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshStandardMaterial({ color: 0xffcf7a, emissive: 0xff9a3c, emissiveIntensity: 1.4 }));
  flame.position.y = height + 0.014;
  group.add(flame);
  const light = new THREE.PointLight(0xffb35c, 0.55, 2.2, 2);
  light.position.y = height + 0.05;
  group.add(light);
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  return group;
}

export { makeRng };
