import * as THREE from "three";
import { Palette } from "../palette";
import type { SceneManager } from "./SceneManager";
import type { SceneEntity } from "./utils/types";
import { createGround, createDistantHills } from "./environment/Terrain";
import { createSkyDome, createSunGlow, createClouds } from "./environment/Sky";
import { createTrees, type TreePlacement } from "./environment/Trees";
import { createRocks, type RockPlacement } from "./environment/Rocks";
import { createGrassField } from "./environment/Grass";
import { createBirds, createButterflies } from "./environment/Wildlife";
import { createSaintFrancis } from "./character/SaintFrancis";

const TREE_PLACEMENTS: TreePlacement[] = [
  { x: -6.5, z: -3, scale: 1.15 },
  { x: -9.5, z: -9, scale: 1.4 },
  { x: 7, z: -4.5, scale: 1.2 },
  { x: 10.5, z: -11, scale: 1.55 },
  { x: -4, z: -14, scale: 1.1 },
  { x: 5, z: -16, scale: 1.3 },
  { x: -13, z: -2, scale: 0.9 },
  { x: 13, z: -6, scale: 1.0 },
];

const ROCK_PLACEMENTS: RockPlacement[] = [
  { x: -2.8, z: 0.6, scale: 0.65 },
  { x: 3.0, z: 0.2, scale: 0.5 },
  { x: -3.8, z: -2.2, scale: 0.85 },
  { x: 4.2, z: -3.0, scale: 0.75 },
  { x: -2.0, z: 2.6, scale: 0.4 },
];

const BUTTERFLY_PLACEMENTS = [
  { x: 1.1, z: 1.4 },
  { x: -1.4, z: 2.1 },
];

export function buildMainMenuScene(manager: SceneManager): { dispose: () => void } {
  const { scene, camera } = manager;

  scene.background = new THREE.Color(Palette.skyHorizon);
  scene.fog = new THREE.Fog(Palette.skyHorizon, 28, 105);

  const entities: SceneEntity[] = [];
  const add = (entity: SceneEntity) => {
    scene.add(entity.object);
    entities.push(entity);
    return entity;
  };

  add(createSkyDome());
  add(createDistantHills());
  add(createGround());
  add(createTrees(TREE_PLACEMENTS));
  add(createRocks(ROCK_PLACEMENTS));
  add(createGrassField(2200, 26, 3.4));
  add(createBirds(4));
  add(createButterflies(BUTTERFLY_PLACEMENTS));

  const francis = createSaintFrancis();
  francis.object.position.set(0, 0, 0);
  francis.object.rotation.y = Math.PI * 0.08;
  add(francis);

  // --- Lighting -----------------------------------------------------
  const sunPosition = new THREE.Vector3(-18, 22, 10);
  const sun = new THREE.DirectionalLight(0xffe0ae, 2.4);
  sun.position.copy(sunPosition);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -12;
  sun.shadow.bias = -0.0015;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 1, 0);

  const hemi = new THREE.HemisphereLight(Palette.skyTop, Palette.oliveDark, 0.75);
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0xbcd6e0, 0.25);
  fill.position.set(10, 6, -14);
  scene.add(fill);

  add(createSunGlow(sunPosition.clone().normalize().multiplyScalar(150)));
  add(createClouds());

  // --- Camera ---------------------------------------------------------
  const cameraBase = new THREE.Vector3(0.5, 1.74, 5.75);
  const cameraLookAt = new THREE.Vector3(0, 1.4, 0);
  camera.position.copy(cameraBase);
  camera.lookAt(cameraLookAt);

  const pointer = { x: 0, y: 0 };
  const onPointerMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointerMove);

  const removeUpdater = manager.addUpdater((dt, elapsed) => {
    for (const entity of entities) entity.update?.(dt, elapsed);
    francis.update?.(dt, elapsed);

    const drift = new THREE.Vector3(
      Math.sin(elapsed * 0.08) * 0.35,
      Math.sin(elapsed * 0.12) * 0.08,
      Math.cos(elapsed * 0.06) * 0.2,
    );
    const parallax = new THREE.Vector3(pointer.x * 0.35, -pointer.y * 0.15, 0);
    const targetPos = cameraBase.clone().add(drift).add(parallax);
    camera.position.lerp(targetPos, 1 - Math.pow(0.001, dt));
    const lookTarget = cameraLookAt.clone().add(new THREE.Vector3(pointer.x * 0.2, -pointer.y * 0.08, 0));
    camera.lookAt(lookTarget);
  });

  return {
    dispose() {
      removeUpdater();
      window.removeEventListener("pointermove", onPointerMove);
    },
  };
}
