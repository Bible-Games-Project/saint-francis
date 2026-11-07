import * as THREE from "three";
import { createHuman, type HumanRig } from "../../character/HumanCharacter";
import { Palette } from "../../../palette";

/** Young Francis, before his conversion — plain merchant-class tunic, no tonsure. */
export function createYoungFrancis(): HumanRig {
  return createHuman({
    skinTone: Palette.skin,
    hairColor: 0x4a3320,
    garmentColor: 0xbd9350,
    garmentAccent: 0x6b4e34,
    legwearColor: 0xd8c6a5,
    shoeColor: 0x5a4530,
    garmentLength: "short",
    headwear: "hair",
    heightScale: 0.98,
    build: 0.95,
  });
}

/** Pietro Bernardone — a prosperous cloth merchant: long fine robe, cap, beard. */
export function createPietro(): HumanRig {
  return createHuman({
    skinTone: 0xdba875,
    hairColor: 0x554438,
    garmentColor: 0x9c5a42,
    garmentAccent: 0x4a3324,
    garmentLength: "long",
    headwear: "cap",
    beard: true,
    heightScale: 1.05,
    build: 1.14,
  });
}

/** Pica Bernardone — Francis's mother: modest dress and veil. */
export function createMother(): HumanRig {
  return createHuman({
    skinTone: Palette.skin,
    hairColor: 0x3f2f22,
    garmentColor: 0xa9765f,
    garmentAccent: 0xece0c4,
    garmentLength: "long",
    headwear: "veil",
    female: true,
    heightScale: 0.94,
    build: 0.88,
  });
}

/** The customer waiting at the shop, cloth-merchant apron and all. */
export function createCustomer(): HumanRig {
  return createHuman({
    skinTone: 0xcf9a6c,
    hairColor: 0x2e2620,
    garmentColor: 0x7a8b92,
    garmentAccent: 0x4b565c,
    apron: true,
    apronColor: 0xd8c9a8,
    headwear: "cap",
    beard: true,
    heightScale: 1.02,
    build: 1.05,
  });
}

const VILLAGER_VARIANTS = [
  { garmentColor: 0x8a9463, garmentAccent: 0x5f6a42, headwear: "cap" as const, female: false },
  { garmentColor: 0xb08468, garmentAccent: 0xece0c4, headwear: "veil" as const, female: true },
  { garmentColor: 0xa5876a, garmentAccent: 0x4a3324, headwear: "hair" as const, female: false },
];

export function createVillager(index: number): HumanRig {
  const v = VILLAGER_VARIANTS[index % VILLAGER_VARIANTS.length];
  return createHuman({
    skinTone: 0xd9a879,
    hairColor: 0x3c2e20,
    garmentColor: v.garmentColor,
    garmentAccent: v.garmentAccent,
    garmentLength: "short",
    headwear: v.headwear,
    female: v.female,
    heightScale: 0.95 + (index % 3) * 0.03,
    build: 0.92 + (index % 2) * 0.1,
  });
}

/** A tied bundle of cloth — the delivery, and the pickup prop on the table. */
export function createClothBundle(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: Palette.terracotta, flatShading: true, roughness: 0.85 });
  const mat2 = new THREE.MeshStandardMaterial({ color: Palette.cream, flatShading: true, roughness: 0.85 });

  const bodyGeo = new THREE.IcosahedronGeometry(0.16, 1);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.scale.set(1.25, 0.62, 0.95);
  group.add(body);

  const foldGeo = new THREE.IcosahedronGeometry(0.1, 0);
  const fold = new THREE.Mesh(foldGeo, mat2);
  fold.scale.set(1.1, 0.55, 0.8);
  fold.position.set(0.02, 0.06, 0.03);
  group.add(fold);

  const tieGeo = new THREE.TorusGeometry(0.13, 0.014, 5, 12);
  const tie = new THREE.Mesh(tieGeo, new THREE.MeshStandardMaterial({ color: 0x4a3324, flatShading: true }));
  tie.rotation.x = Math.PI / 2;
  tie.rotation.z = 0.3;
  tie.position.y = 0.02;
  group.add(tie);

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return group;
}
