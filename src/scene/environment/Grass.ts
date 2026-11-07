import * as THREE from "three";
import { Palette } from "../../palette";
import { pathDistance } from "./Terrain";
import { makeRng } from "../utils/types";
import type { SceneEntity } from "../utils/types";

function buildBladeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(0.09, 0.55, 1, 3);
  geometry.translate(0, 0.275, 0); // pivot at the base
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp(y / 0.55, 0, 1);
    pos.setX(i, pos.getX(i) * (1 - t * 0.75)); // taper to a point at the tip
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A field of instanced grass blades that gently sway. Wind bending is done
 * on the GPU (per-vertex, keyed by blade height) via a small vertex shader
 * injection so thousands of blades stay cheap to animate.
 */
export function createGrassField(count: number, radius: number, innerRadius: number, seed = 41): SceneEntity {
  const geometry = buildBladeGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: Palette.oliveLight,
    flatShading: true,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  const uniforms = { uTime: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        attribute float aPhase;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float windBend = sin(uTime * 1.6 + aPhase) * 0.14 + sin(uTime * 3.1 + aPhase * 2.0) * 0.05;
        float heightFactor = clamp(position.y / 0.55, 0.0, 1.0);
        transformed.x += windBend * heightFactor * heightFactor;`,
      );
  };

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = "grass";
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const rng = makeRng(seed);
  const dummy = new THREE.Object3D();
  const phases = new Float32Array(count);

  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 6) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const r = innerRadius + rng() * (radius - innerRadius);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r - 6;

    if (pathDistance(x, z) < 2.6) continue; // keep the path clear

    dummy.position.set(x, 0, z);
    dummy.rotation.y = rng() * Math.PI;
    const scale = 0.7 + rng() * 0.7;
    dummy.scale.set(scale, scale * (0.8 + rng() * 0.5), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    phases[placed] = rng() * Math.PI * 2;
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;

  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));

  return {
    object: mesh,
    update(_dt, elapsed) {
      uniforms.uTime.value = elapsed;
    },
  };
}
