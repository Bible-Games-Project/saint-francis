import * as THREE from "three";
import { Palette } from "../../palette";
import { makeRng } from "../utils/types";
import type { SceneEntity } from "../utils/types";

/** Large inverted sphere with a vertical gradient, standing in for a sky. */
export function createSkyDome(): SceneEntity {
  const geometry = new THREE.SphereGeometry(400, 24, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(Palette.skyTop) },
      horizonColor: { value: new THREE.Color(Palette.skyHorizon) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPosition;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      void main() {
        float h = normalize(vWorldPosition).y;
        float t = smoothstep(-0.05, 0.55, h);
        vec3 color = mix(horizonColor, topColor, t);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "skyDome";
  return { object: mesh };
}

function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 244, 214, 0.9)");
  gradient.addColorStop(0.4, "rgba(255, 220, 160, 0.35)");
  gradient.addColorStop(1, "rgba(255, 220, 160, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Soft warm glow sprite placed at the sun position for a cinematic haze. */
export function createSunGlow(sunPosition: THREE.Vector3): SceneEntity {
  const material = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = "sunGlow";
  sprite.position.copy(sunPosition);
  sprite.scale.setScalar(90);
  return { object: sprite };
}

function makeCloudPuff(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: Palette.cream,
    flatShading: true,
    roughness: 1,
    transparent: true,
    opacity: 0.85,
    fog: true,
  });
  const lobes = 4;
  for (let i = 0; i < lobes; i++) {
    const radius = 2.4 + Math.random() * 1.6;
    const geometry = new THREE.IcosahedronGeometry(radius, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((i - lobes / 2) * 2.6 + Math.random(), Math.random() * 0.8, Math.random() * 1.2);
    mesh.scale.y = 0.55;
    group.add(mesh);
  }
  return group;
}

/** A few soft low-poly clouds drifting slowly across the sky. */
export function createClouds(): SceneEntity {
  const group = new THREE.Group();
  group.name = "clouds";
  const rng = makeRng(99);
  const puffs: { object: THREE.Group; speed: number; baseX: number }[] = [];

  const count = 4;
  for (let i = 0; i < count; i++) {
    const puff = makeCloudPuff();
    const angle = (i / count) * Math.PI * 2 + rng() * 0.6;
    const dist = 60 + rng() * 30;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist - 20;
    puff.position.set(x, 26 + rng() * 10, z);
    const scale = 1 + rng() * 0.8;
    puff.scale.setScalar(scale);
    group.add(puff);
    puffs.push({ object: puff, speed: 0.15 + rng() * 0.15, baseX: x });
  }

  return {
    object: group,
    update(_dt, elapsed) {
      puffs.forEach((p, i) => {
        p.object.position.x = p.baseX + Math.sin(elapsed * 0.02 + i) * 4 + elapsed * p.speed * 0.15;
      });
    },
  };
}
