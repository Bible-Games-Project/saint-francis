import * as THREE from "three";
import { Palette } from "../../palette";
import { makeRng } from "../utils/types";
import type { SceneEntity } from "../utils/types";

function buildBirdGeometry(): THREE.BufferGeometry {
  // A simple "M" silhouette made from two triangular wings — reads as a
  // distant flying bird without needing a rig.
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(-0.08, 0.16);
  shape.lineTo(0, 0.02);
  shape.lineTo(0.08, 0.16);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, -0.05);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** A handful of birds silhouetted against the sky, circling far above the hills. */
export function createBirds(count = 4, seed = 61): SceneEntity {
  const group = new THREE.Group();
  group.name = "birds";
  const geometry = buildBirdGeometry();
  const material = new THREE.MeshBasicMaterial({
    color: Palette.habitBrownDark,
    side: THREE.DoubleSide,
    fog: true,
  });

  const rng = makeRng(seed);
  const birds: { mesh: THREE.Mesh; radius: number; height: number; speed: number; phase: number; wingPhase: number }[] = [];

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    const radius = 30 + rng() * 18;
    const height = 18 + rng() * 8;
    const speed = 0.06 + rng() * 0.04;
    const phase = rng() * Math.PI * 2;
    mesh.scale.setScalar(0.9 + rng() * 0.5);
    group.add(mesh);
    birds.push({ mesh, radius, height, speed, phase, wingPhase: rng() * Math.PI * 2 });
  }

  return {
    object: group,
    update(_dt, elapsed) {
      for (const b of birds) {
        const angle = elapsed * b.speed + b.phase;
        const x = Math.cos(angle) * b.radius;
        const z = Math.sin(angle) * b.radius * 0.7 - 25;
        b.mesh.position.set(x, b.height + Math.sin(angle * 2) * 1.2, z);
        b.mesh.rotation.y = -angle + Math.PI / 2;
        b.mesh.rotation.x = Math.PI / 2 - 0.15;
        const flap = Math.sin(elapsed * 8 + b.wingPhase) * 0.35;
        b.mesh.rotation.z = flap;
      }
    },
  };
}

function buildButterflyGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.22, 0.18, 0.05, 0.3);
  shape.quadraticCurveTo(-0.02, 0.2, 0, 0);
  return new THREE.ShapeGeometry(shape);
}

/** A couple of small butterflies fluttering near the ground, close to Francis. */
export function createButterflies(placements: { x: number; z: number }[], seed = 71): SceneEntity {
  const group = new THREE.Group();
  group.name = "butterflies";
  const geometry = buildButterflyGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: Palette.terracotta,
    side: THREE.DoubleSide,
    flatShading: true,
    roughness: 0.6,
  });

  const rng = makeRng(seed);
  const butterflies: { pivot: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; base: THREE.Vector3; phase: number }[] = [];

  for (const p of placements) {
    const pivot = new THREE.Group();
    const wingL = new THREE.Mesh(geometry, material);
    const wingR = new THREE.Mesh(geometry, material);
    wingR.scale.x = -1;
    pivot.add(wingL, wingR);
    const base = new THREE.Vector3(p.x, 0.35 + rng() * 0.25, p.z);
    pivot.position.copy(base);
    pivot.scale.setScalar(0.32);
    group.add(pivot);
    butterflies.push({ pivot, wingL, wingR, base, phase: rng() * Math.PI * 2 });
  }

  return {
    object: group,
    update(_dt, elapsed) {
      for (const b of butterflies) {
        const t = elapsed * 0.7 + b.phase;
        b.pivot.position.set(
          b.base.x + Math.sin(t) * 0.35,
          b.base.y + Math.sin(t * 1.7) * 0.1,
          b.base.z + Math.cos(t * 0.8) * 0.35,
        );
        b.pivot.rotation.y = -t * 0.8;
        const flap = Math.abs(Math.sin(elapsed * 14 + b.phase)) * 1.1;
        b.wingL.rotation.y = flap;
        b.wingR.rotation.y = -flap;
      }
    },
  };
}
