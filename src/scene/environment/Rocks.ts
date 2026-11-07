import * as THREE from "three";
import { Palette } from "../../palette";
import { makeRng } from "../utils/types";
import type { SceneEntity } from "../utils/types";

const rockMaterial = new THREE.MeshStandardMaterial({
  color: Palette.rock,
  flatShading: true,
  roughness: 0.95,
});

const mossyRockMaterial = new THREE.MeshStandardMaterial({
  color: Palette.stoneDark,
  flatShading: true,
  roughness: 0.95,
});

export interface RockPlacement {
  x: number;
  z: number;
  scale?: number;
}

/** Small clusters of faceted low-poly rocks, scattered near the path. */
export function createRocks(placements: RockPlacement[], seed = 17): SceneEntity {
  const group = new THREE.Group();
  group.name = "rocks";
  const rng = makeRng(seed);

  for (const p of placements) {
    const clusterCount = 1 + Math.floor(rng() * 3);
    const cluster = new THREE.Group();
    for (let i = 0; i < clusterCount; i++) {
      const geometry = new THREE.IcosahedronGeometry(0.35 + rng() * 0.4, 0);
      const material = rng() > 0.5 ? rockMaterial : mossyRockMaterial;
      const rock = new THREE.Mesh(geometry, material);
      rock.position.set((rng() - 0.5) * 0.9, 0.15 + rng() * 0.1, (rng() - 0.5) * 0.9);
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      rock.scale.set(1 + rng() * 0.4, 0.7 + rng() * 0.5, 1 + rng() * 0.4);
      rock.castShadow = true;
      rock.receiveShadow = true;
      cluster.add(rock);
    }
    cluster.position.set(p.x, 0, p.z);
    cluster.scale.setScalar(p.scale ?? 0.8 + rng() * 0.6);
    cluster.rotation.y = rng() * Math.PI * 2;
    group.add(cluster);
  }

  return { object: group };
}
