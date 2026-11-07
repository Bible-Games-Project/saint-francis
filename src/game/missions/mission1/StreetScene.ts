import * as THREE from "three";
import { Palette } from "../../../palette";
import { makeRng } from "../../../scene/utils/types";
import type { Collider } from "../../Collision";
import { createSkyDome, createSunGlow, createClouds } from "../../../scene/environment/Sky";
import { createDistantHills } from "../../../scene/environment/Terrain";
import { createBirds } from "../../../scene/environment/Wildlife";
import type { SceneEntity } from "../../../scene/utils/types";
import { cobbleFloor, barrel, basket, crate, hangingCloth, woodDark, woodMed } from "./buildingParts";

export interface StreetSceneResult {
  colliders: Collider[];
  spawnPoint: { x: number; z: number; yaw: number };
  customerPosition: THREE.Vector3;
  customerYaw: number;
  villagerAnchors: { position: THREE.Vector3; yaw: number; kind: "idle" | "pace" | "sit" }[];
  update(dt: number, elapsed: number): void;
}

const plasterPalette = [0xe3d3ae, 0xd9c49a, 0xc9b48d, 0xe0c9a0];
const roofPalette = [0xa5583c, 0x8f4a34, 0xb06840];

function pitchedRoof(width: number, depth: number, height: number, color: number, rng: () => number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 });
  const slabW = Math.sqrt((width / 2) ** 2 + height ** 2);
  const angle = Math.atan2(height, width / 2);
  for (const side of [-1, 1]) {
    const geo = new THREE.BoxGeometry(slabW, 0.08, depth + 0.28);
    const slab = new THREE.Mesh(geo, mat);
    slab.position.set((side * width) / 4, height / 2, 0);
    slab.rotation.z = side * (Math.PI / 2 - angle);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
  }
  // A little ridge irregularity so it doesn't read as a perfect prism.
  group.rotation.z = (rng() - 0.5) * 0.02;
  return group;
}

function windowDecal(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2e1e, flatShading: true, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x2c2a22,
    flatShading: true,
    roughness: 0.6,
    emissive: 0x1a1610,
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.05), frameMat);
  group.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.8, height * 0.8), glassMat);
  glass.position.z = 0.03;
  group.add(glass);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(width * 1.3, 0.04, 0.12), woodDark);
  sill.position.set(0, -height / 2 - 0.03, 0.06);
  group.add(sill);
  return group;
}

function doorDecal(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x4a3320, flatShading: true, roughness: 0.85 }),
  );
  group.add(door);
  for (const dy of [-height * 0.2, height * 0.22]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.04, 0.07), woodDark);
    strap.position.set(0, dy, 0.03);
    group.add(strap);
  }
  return group;
}

function balcony(width: number): THREE.Group {
  const group = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.45), woodMed);
  group.add(platform);
  const railGeo = new THREE.BoxGeometry(width, 0.06, 0.04);
  const rail = new THREE.Mesh(railGeo, woodDark);
  rail.position.set(0, 0.42, 0.2);
  group.add(rail);
  const postCount = 4;
  for (let i = 0; i < postCount; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.035), woodDark);
    post.position.set(-width / 2 + (width / (postCount - 1)) * i, 0.21, 0.2);
    group.add(post);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

interface BuildingOptions {
  width: number;
  depth: number;
  height: number;
  x: number;
  z: number;
  facingSign: 1 | -1; // which way (along x) the building fronts the street
  rng: () => number;
  hasBalcony?: boolean;
  hasBeams?: boolean;
}

function building(opts: BuildingOptions): { object: THREE.Group; collider: Collider } {
  const { width, depth, height, x, z, facingSign, rng } = opts;
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const stoneH = Math.min(0.55, height * 0.28);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb3a582, flatShading: true, roughness: 0.95 });
  const plasterColor = plasterPalette[Math.floor(rng() * plasterPalette.length)];
  const plasterMat = new THREE.MeshStandardMaterial({ color: plasterColor, flatShading: true, roughness: 0.92 });

  const stone = new THREE.Mesh(new THREE.BoxGeometry(width, stoneH, depth), stoneMat);
  stone.position.y = stoneH / 2;
  group.add(stone);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(width, height - stoneH, depth), plasterMat);
  upper.position.y = stoneH + (height - stoneH) / 2;
  group.add(upper);

  const roofColor = roofPalette[Math.floor(rng() * roofPalette.length)];
  const roof = pitchedRoof(width * 1.04, depth * 1.02, height * 0.42, roofColor, rng);
  roof.position.y = height;
  group.add(roof);

  const front = facingSign;
  const doorH = 1.85;
  const door = doorDecal(0.72, doorH);
  door.position.set(width * 0.18 * (rng() > 0.5 ? 1 : -1), doorH / 2, (front * depth) / 2 + 0.03);
  if (front < 0) door.rotation.y = Math.PI;
  group.add(door);

  const winCount = width > 2.6 ? 2 : 1;
  for (let i = 0; i < winCount; i++) {
    const win = windowDecal(0.55, 0.62);
    const wx = (i - (winCount - 1) / 2) * 1.05 + (rng() - 0.5) * 0.2;
    win.position.set(wx, height * 0.72, (front * depth) / 2 + 0.03);
    if (front < 0) win.rotation.y = Math.PI;
    group.add(win);

    if (opts.hasBalcony && i === 0) {
      const b = balcony(0.9);
      b.position.set(wx, height * 0.72 - 0.42, (front * depth) / 2 + 0.24);
      if (front < 0) b.rotation.y = Math.PI;
      group.add(b);
    }
  }

  if (opts.hasBeams) {
    for (const bx of [-width / 2 + 0.1, width / 2 - 0.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, height - stoneH, 0.06), woodDark);
      post.position.set(bx, stoneH + (height - stoneH) / 2, (front * depth) / 2 + 0.035);
      group.add(post);
    }
  }

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    object: group,
    collider: { type: "box", minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 },
  };
}

function potted(): THREE.Group {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.09, 0.2, 7),
    new THREE.MeshStandardMaterial({ color: 0xb3673f, flatShading: true, roughness: 0.9 }),
  );
  pot.position.y = 0.1;
  group.add(pot);
  const leafMat = new THREE.MeshStandardMaterial({ color: Palette.oliveDark, flatShading: true, roughness: 0.85 });
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), leafMat);
    leaf.position.set((Math.random() - 0.5) * 0.14, 0.28 + Math.random() * 0.1, (Math.random() - 0.5) * 0.14);
    leaf.scale.set(0.8, 1.3, 0.8);
    group.add(leaf);
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

export function buildStreetScene(scene: THREE.Scene): StreetSceneResult {
  scene.background = new THREE.Color(Palette.skyHorizon);
  scene.fog = new THREE.Fog(Palette.skyHorizon, 16, 62);

  const root = new THREE.Group();
  scene.add(root);
  const entities: SceneEntity[] = [];
  const add = (e: SceneEntity) => {
    root.add(e.object);
    entities.push(e);
  };

  add(createSkyDome());
  add(createDistantHills());
  add(createClouds());
  add(createSunGlow(new THREE.Vector3(-22, 26, 18).normalize().multiplyScalar(150)));
  add(createBirds(3, 91));

  const ground = cobbleFloor(11, 26, 0xafa286);
  ground.position.set(0, 0, 11);
  root.add(ground);

  const colliders: Collider[] = [
    { type: "box", minX: -5.4, maxX: -4.6, minZ: -3, maxZ: 23 },
    { type: "box", minX: 4.6, maxX: 5.4, minZ: -3, maxZ: 23 },
    { type: "box", minX: -5.4, maxX: 5.4, minZ: -3.2, maxZ: -2.4 },
    { type: "box", minX: -5.4, maxX: 5.4, minZ: 22.6, maxZ: 23.4 },
  ];

  const rng = makeRng(53);
  const buildingsData: BuildingOptions[] = [
    { width: 2.6, depth: 3.0, height: 3.1, x: -3.5, z: 2.2, facingSign: 1, rng, hasBeams: true },
    { width: 2.2, depth: 2.6, height: 2.7, x: -3.35, z: 6.6, facingSign: 1, rng, hasBalcony: true },
    { width: 2.8, depth: 3.0, height: 3.4, x: -3.55, z: 11.5, facingSign: 1, rng, hasBeams: true },
    { width: 2.3, depth: 2.7, height: 2.9, x: 3.5, z: 4.0, facingSign: -1, rng, hasBalcony: true },
    { width: 2.7, depth: 3.0, height: 3.2, x: 3.55, z: 9.0, facingSign: -1, rng, hasBeams: true },
    { width: 2.4, depth: 2.6, height: 2.8, x: 3.4, z: 13.6, facingSign: -1, rng },
  ];
  for (const b of buildingsData) {
    const built = building(b);
    root.add(built.object);
    colliders.push(built.collider);
  }

  // The customer's shop, at the head of the street — a touch larger and
  // warmer-lit than the houses along the way.
  const shop = building({ width: 3.2, depth: 3.1, height: 3.3, x: 0, z: 18.6, facingSign: -1, rng, hasBeams: true, hasBalcony: true });
  root.add(shop.object);
  colliders.push(shop.collider);

  const awning = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 1.4, 6, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: Palette.terracotta, flatShading: true, roughness: 0.85, side: THREE.DoubleSide }),
  );
  awning.rotation.z = Math.PI / 2;
  awning.rotation.y = Math.PI / 2;
  awning.scale.y = 0.55;
  awning.position.set(0, 2.15, 17.15);
  awning.castShadow = true;
  root.add(awning);

  // --- Street props -----------------------------------------------------
  const propRng = makeRng(71);
  const b1 = barrel();
  b1.position.set(-2.0, 0, 3.4);
  root.add(b1);
  colliders.push({ type: "circle", x: -2.0, z: 3.4, radius: 0.32 });

  const b2 = barrel(0.24, 0.46);
  b2.position.set(-1.75, 0, 3.85);
  root.add(b2);
  colliders.push({ type: "circle", x: -1.75, z: 3.85, radius: 0.28 });

  for (let i = 0; i < 3; i++) {
    const crateSize = 0.36 + propRng() * 0.08;
    const cr = crate(crateSize);
    cr.position.set(2.05 + (i % 2) * 0.4, (crateSize * 0.85) / 2, 6.6 + Math.floor(i / 2) * 0.42);
    cr.rotation.y = propRng() * 0.6;
    root.add(cr);
  }
  colliders.push({ type: "box", minX: 1.75, maxX: 2.7, minZ: 6.3, maxZ: 7.2 });

  const bsk1 = basket();
  bsk1.position.set(-1.9, 0.12, 12.0);
  root.add(bsk1);
  const bsk2 = basket(0.17, 0.18);
  bsk2.position.set(-1.65, 0.09, 12.25);
  root.add(bsk2);

  for (const p of [
    { x: -2.1, z: 0.6 },
    { x: 1.9, z: 5.0 },
    { x: -2.0, z: 14.4 },
    { x: 2.1, z: 17.6 },
  ]) {
    const pot = potted();
    pot.position.set(p.x, 0, p.z);
    root.add(pot);
  }

  // Hanging cloth lines between buildings — thematically tying to the cloth
  // trade, and a bit of gentle motion.
  const clothSwatches: THREE.Mesh[] = [];
  const swatchColors = [Palette.terracotta, 0x8a9463, Palette.beige];
  for (let i = 0; i < 3; i++) {
    const c = hangingCloth(0.5, 0.65, swatchColors[i % swatchColors.length]);
    c.position.set(-3.1 + i * 0.36, 2.35, 6.9);
    c.rotation.y = Math.PI / 2;
    root.add(c);
    clothSwatches.push(c);
  }

  // Stone steps up to the shop entrance.
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(2.6 - i * 0.15, 0.12, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xb3a582, flatShading: true, roughness: 0.95 }),
    );
    step.position.set(0, 0.06 + i * 0.12, 17.6 - i * 0.28);
    step.receiveShadow = true;
    step.castShadow = true;
    root.add(step);
  }

  // --- Lighting -----------------------------------------------------
  const sunPosition = new THREE.Vector3(-16, 20, 12);
  const sun = new THREE.DirectionalLight(0xffe0ae, 2.2);
  sun.position.copy(sunPosition);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -6;
  sun.shadow.bias = -0.0015;
  scene.add(sun, sun.target);
  sun.target.position.set(0, 1, 10);

  const hemi = new THREE.HemisphereLight(Palette.skyTop, 0x6b5f42, 0.7);
  scene.add(hemi);

  return {
    colliders,
    spawnPoint: { x: 0, z: 0.2, yaw: 0 },
    customerPosition: new THREE.Vector3(0, 0, 16.7),
    customerYaw: Math.PI,
    villagerAnchors: [
      { position: new THREE.Vector3(-2.6, 0, 8.6), yaw: Math.PI * 0.4, kind: "idle" },
      { position: new THREE.Vector3(1.2, 0, 10.5), yaw: 0, kind: "pace" },
    ],
    update(_dt, elapsed) {
      for (const e of entities) e.update?.(_dt, elapsed);
      clothSwatches.forEach((c, i) => {
        c.rotation.z = Math.sin(elapsed * 1.4 + i) * 0.05;
      });
    },
  };
}
