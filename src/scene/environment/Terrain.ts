import * as THREE from "three";
import { Palette } from "../../palette";
import { fbm2D } from "../utils/noise";
import type { SceneEntity } from "../utils/types";

const groundColor = new THREE.Color(Palette.oliveLight);
const groundColorLow = new THREE.Color(Palette.moss);
const pathColor = new THREE.Color(Palette.terracotta);
const pathEdgeColor = new THREE.Color(Palette.beige);

/** Distance from the world center-line path, used to blend in the dirt trail. */
export function pathDistance(x: number, z: number): number {
  // The path winds gently as it recedes from the camera (z decreasing = further).
  const curveX = Math.sin(z * 0.05) * 2.2 + Math.sin(z * 0.017) * 1.4;
  return Math.abs(x - curveX);
}

/** The main foreground ground plane: rolling low-poly terrain with a dirt path. */
export function createGround(): SceneEntity {
  const size = 140;
  const segments = 90;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    const distFromCenter = Math.hypot(x, z);
    const rolling = fbm2D(x * 0.045, z * 0.045, 4, 2, 0.5, 7) - 0.5;
    const flatten = THREE.MathUtils.smoothstep(distFromCenter, 6, 22); // keep the clearing near Francis flat
    let height = rolling * 3.4 * flatten;

    // Gentle rise toward the far hills so the ground meets them naturally.
    height += Math.max(0, -z - 30) * 0.03;

    pos.setY(i, height);

    const dPath = pathDistance(x, z);
    const pathMix = THREE.MathUtils.smoothstep(dPath, 4.2, 1.1);
    const patch = fbm2D(x * 0.12, z * 0.12, 3, 2, 0.5, 21);
    tmpColor.copy(groundColor).lerp(groundColorLow, patch * 0.6);

    if (dPath < 4.2) {
      const edgeMix = THREE.MathUtils.smoothstep(dPath, 1.6, 3.4);
      const dirt = tmpColor.clone().lerp(pathColor, 1 - pathMix);
      tmpColor.copy(dirt).lerp(pathEdgeColor, (1 - edgeMix) * 0.25);
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "ground";
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  return { object: mesh };
}

function createHillLayer(radius: number, height: number, color: number, distance: number, seed: number): THREE.Mesh {
  const segments = 24;
  const geometry = new THREE.CircleGeometry(radius, segments);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const distFromCenter = Math.hypot(x, y) / radius;
    const bump = fbm2D(x * 0.05, y * 0.05, 3, 2, 0.5, seed);
    const h = Math.max(0, 1 - distFromCenter) ** 1.15 * height * (0.7 + bump * 0.6);
    pos.setZ(i, h);
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 1,
    fog: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.4, -distance);
  mesh.receiveShadow = false;
  return mesh;
}

/** Layered silhouette hills fading into the fog, for atmospheric depth. */
export function createDistantHills(): SceneEntity {
  const group = new THREE.Group();
  group.name = "distantHills";
  // Radius is kept well below distance so the circular hill mesh's near rim
  // never wraps forward past the clearing (it did at radius ~= distance,
  // burying the character under a "hill" reaching into the foreground).
  group.add(createHillLayer(58, 20, Palette.hillFar, 92, 3));
  group.add(createHillLayer(48, 16, Palette.hillMid, 70, 11));
  group.add(createHillLayer(38, 12, Palette.hillNear, 52, 19));
  return { object: group };
}
