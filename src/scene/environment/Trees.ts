import * as THREE from "three";
import { Palette } from "../../palette";
import { makeRng } from "../utils/types";
import type { SceneEntity } from "../utils/types";

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: Palette.habitBrownDark,
  flatShading: true,
  roughness: 0.9,
});

const foliageMaterials = [
  new THREE.MeshStandardMaterial({ color: Palette.oliveDark, flatShading: true, roughness: 0.85 }),
  new THREE.MeshStandardMaterial({ color: Palette.olive, flatShading: true, roughness: 0.85 }),
  new THREE.MeshStandardMaterial({ color: Palette.oliveLight, flatShading: true, roughness: 0.85 }),
];

/** One stylized low-poly tree: tapered trunk + a few layered faceted foliage clumps. */
function buildTree(rng: () => number): THREE.Group {
  const group = new THREE.Group();

  const trunkHeight = 2.6 + rng() * 1.4;
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.24, trunkHeight, 6, 2);
  // Bend the trunk slightly for a hand-modeled, non-mechanical silhouette.
  const posAttr = trunkGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const bend = (y / trunkHeight + 0.5) ** 2 * 0.25;
    posAttr.setX(i, posAttr.getX(i) + bend);
  }
  trunkGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const clumpCount = 3 + Math.floor(rng() * 2);
  const canopy = new THREE.Group();
  canopy.position.y = trunkHeight * 0.85;
  for (let i = 0; i < clumpCount; i++) {
    const radius = 0.85 + rng() * 0.55 - i * 0.08;
    const geometry = new THREE.IcosahedronGeometry(Math.max(0.45, radius), 1);
    const material = foliageMaterials[Math.floor(rng() * foliageMaterials.length)];
    const clump = new THREE.Mesh(geometry, material);
    const angle = (i / clumpCount) * Math.PI * 2 + rng();
    const spread = i === 0 ? 0 : 0.55 + rng() * 0.35;
    clump.position.set(Math.cos(angle) * spread, i * 0.55 + rng() * 0.3, Math.sin(angle) * spread);
    clump.scale.setScalar(0.85 + rng() * 0.3);
    clump.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    clump.castShadow = true;
    clump.receiveShadow = true;
    canopy.add(clump);
  }
  group.add(canopy);
  group.userData.canopy = canopy;

  return group;
}

export interface TreePlacement {
  x: number;
  z: number;
  scale?: number;
  rotation?: number;
}

/** Scatters stylized trees at the given placements, with a gentle idle sway. */
export function createTrees(placements: TreePlacement[], seed = 5): SceneEntity {
  const group = new THREE.Group();
  group.name = "trees";
  const rng = makeRng(seed);
  const canopies: { canopy: THREE.Group; phase: number; speed: number }[] = [];

  for (const p of placements) {
    const tree = buildTree(rng);
    tree.position.set(p.x, 0, p.z);
    tree.rotation.y = p.rotation ?? rng() * Math.PI * 2;
    tree.scale.setScalar(p.scale ?? 0.85 + rng() * 0.5);
    group.add(tree);
    canopies.push({
      canopy: tree.userData.canopy as THREE.Group,
      phase: rng() * Math.PI * 2,
      speed: 0.5 + rng() * 0.3,
    });
  }

  return {
    object: group,
    update(_dt, elapsed) {
      for (const c of canopies) {
        const sway = Math.sin(elapsed * c.speed + c.phase) * 0.035;
        c.canopy.rotation.z = sway;
        c.canopy.rotation.x = sway * 0.6;
      }
    },
  };
}
