import * as THREE from "three";
import { Palette } from "../../../palette";
import type { Collider } from "../../Collision";
import {
  plasterMaterial,
  wallRun,
  beam,
  plankFloor,
  table,
  chest,
  shelfUnit,
  jar,
  clothRoll,
  hangingCloth,
  candle,
  woodDark,
  woodMed,
} from "./buildingParts";

export interface HouseSceneResult {
  colliders: Collider[];
  spawnPoint: { x: number; z: number; yaw: number };
  fatherPosition: THREE.Vector3;
  fatherYaw: number;
  motherPosition: THREE.Vector3;
  motherYaw: number;
  tablePosition: THREE.Vector3;
  clothPosition: THREE.Vector3;
  doorObject: THREE.Object3D;
  doorPivot: THREE.Group;
  doorOuterPoint: { x: number; z: number; yaw: number };
  openDoor: () => void;
}

const HALF_W = 3.5;
const HALF_D = 2.75;
const WALL_H = 2.7;
const WALL_T = 0.22;

export function buildHouseScene(scene: THREE.Scene): HouseSceneResult {
  scene.background = new THREE.Color(0x352a1c);
  scene.fog = new THREE.FogExp2(0x352a1c, 0.032);

  const root = new THREE.Group();
  scene.add(root);

  const plaster = plasterMaterial(0xe3d3ae);
  const plasterDark = plasterMaterial(0xcfbd93);

  // --- Floor & ceiling --------------------------------------------------
  const floor = plankFloor(HALF_W * 2, HALF_D * 2, 0x8a6a48);
  root.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF_W * 2, HALF_D * 2),
    new THREE.MeshStandardMaterial({ color: 0x5a4a32, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_H;
  root.add(ceiling);

  for (let i = -2; i <= 2; i++) {
    const b = beam(HALF_D * 2 - 0.2);
    b.rotation.y = Math.PI / 2;
    b.position.set(i * 1.3, WALL_H - 0.1, 0);
    root.add(b);
  }

  const colliders: Collider[] = [];

  function addWallSegments(group: THREE.Group, x: number, z: number, rotY: number) {
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    root.add(group);
    group.updateWorldMatrix(true, false);
    group.children.forEach((child) => {
      const box = new THREE.Box3().setFromObject(child);
      colliders.push({ type: "box", minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
    });
  }

  // South wall (with the door)
  const doorWidth = 1.05;
  const southWall = wallRun(HALF_W * 2, WALL_H, WALL_T, plaster, {
    center: 0,
    width: doorWidth,
    sill: 0,
    top: 2.05,
  });
  addWallSegments(southWall, 0, -HALF_D, 0);

  // North wall (with a window)
  const northWall = wallRun(HALF_W * 2, WALL_H, WALL_T, plasterDark, {
    center: -1.1,
    width: 0.85,
    sill: 1.3,
    top: 2.15,
  });
  addWallSegments(northWall, 0, HALF_D, Math.PI);

  // East wall (with a window)
  const eastWall = wallRun(HALF_D * 2, WALL_H, WALL_T, plaster, {
    center: 0.4,
    width: 0.8,
    sill: 1.35,
    top: 2.1,
  });
  addWallSegments(eastWall, HALF_W, 0, -Math.PI / 2);

  // West wall (solid)
  const westWall = wallRun(HALF_D * 2, WALL_H, WALL_T, plasterDark);
  addWallSegments(westWall, -HALF_W, 0, Math.PI / 2);

  // Window sills / warm glass sprites so the openings read as glazed light,
  // not black holes.
  function glassPane(width: number, height: number): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(width * 0.86, height * 0.86);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffe6ad,
      emissive: 0xffcf82,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
  }
  const paneN = glassPane(0.85, 0.85);
  paneN.position.set(-1.1, (1.3 + 2.15) / 2, HALF_D - 0.02);
  paneN.rotation.y = Math.PI;
  root.add(paneN);
  const paneE = glassPane(0.8, 0.75);
  paneE.position.set(HALF_W - 0.02, (1.35 + 2.1) / 2, 0.4);
  paneE.rotation.y = -Math.PI / 2;
  root.add(paneE);

  // --- Door ---------------------------------------------------------
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-doorWidth / 2, 0, -HALF_D);
  root.add(doorPivot);
  const doorGeo = new THREE.BoxGeometry(doorWidth - 0.04, 2.0, 0.06);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a4025, flatShading: true, roughness: 0.8 });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set((doorWidth - 0.04) / 2, 1.0, 0);
  doorMesh.castShadow = true;
  doorMesh.receiveShadow = true;
  doorPivot.add(doorMesh);
  for (const dy of [0.55, 1.45]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 0.08, 0.05, 0.07), woodDark);
    strap.position.set((doorWidth - 0.04) / 2, dy, 0.005);
    doorPivot.add(strap);
  }
  colliders.push({
    type: "box",
    minX: -doorWidth / 2 - 0.03,
    maxX: doorWidth / 2 + 0.03,
    minZ: -HALF_D - 0.08,
    maxZ: -HALF_D + 0.08,
  });
  const doorClosedCollider = colliders[colliders.length - 1] as Extract<Collider, { type: "box" }>;

  let doorOpened = false;
  function openDoor(): void {
    if (doorOpened) return;
    doorOpened = true;
    const idx = colliders.indexOf(doorClosedCollider);
    if (idx >= 0) colliders.splice(idx, 1);
    const start = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - start) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      doorPivot.rotation.y = -eased * (Math.PI * 0.62);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  // --- Furniture ----------------------------------------------------
  const tableGroup = table(1.3, 0.7);
  tableGroup.position.set(1.3, 0, 1.5);
  root.add(tableGroup);
  colliders.push({ type: "box", minX: 1.3 - 0.72, maxX: 1.3 + 0.72, minZ: 1.5 - 0.42, maxZ: 1.5 + 0.42 });

  const clothPosition = new THREE.Vector3(1.05, 0.8, 1.42);

  const chest1 = chest();
  chest1.position.set(-2.65, 0, -1.7);
  chest1.rotation.y = 0.25;
  root.add(chest1);
  colliders.push({ type: "circle", x: -2.65, z: -1.7, radius: 0.55 });

  const chest2 = chest(0.55, 0.36, 0.36);
  chest2.position.set(-2.75, 0, -0.4);
  chest2.rotation.y = -0.15;
  root.add(chest2);
  colliders.push({ type: "circle", x: -2.75, z: -0.4, radius: 0.5 });

  const shelf = shelfUnit(1.0, 1.6, 0.3);
  shelf.position.set(-3.25, 0, 1.5);
  shelf.rotation.y = Math.PI / 2;
  root.add(shelf);
  colliders.push({ type: "box", minX: -3.42, maxX: -3.08, minZ: 1.0, maxZ: 2.0 });

  const jarColors = [0xb7ab8f, 0x9c8a6a, 0xc0a878];
  for (let i = 0; i < 3; i++) {
    const j = jar(0.075 + i * 0.01, 0.16 + i * 0.02, jarColors[i]);
    j.position.set(-3.25 + (i - 1) * 0.22, 1.08, 1.5);
    root.add(j);
  }
  const roll1 = clothRoll(0.42, 0.07, Palette.terracotta);
  roll1.position.set(-3.25, 0.62, 1.32);
  root.add(roll1);
  const roll2 = clothRoll(0.42, 0.065, 0x8a9463);
  roll2.position.set(-3.25, 0.62, 1.68);
  root.add(roll2);

  const cloth = hangingCloth(0.55, 0.75, 0x9c5a42);
  cloth.position.set(2.7, 1.85, HALF_D - WALL_T / 2 - 0.02);
  root.add(cloth);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.28), woodMed);
  bench.position.set(1.3, 0.42, 0.7);
  bench.castShadow = true;
  bench.receiveShadow = true;
  root.add(bench);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.24), woodDark);
    leg.position.set(1.3 + sx * 0.38, 0.21, 0.7);
    root.add(leg);
  }

  const candle1 = candle();
  candle1.position.set(1.7, 0.78, 1.3);
  root.add(candle1);
  const candle2 = candle(0.1);
  candle2.position.set(-3.25, 1.7, 1.5);
  root.add(candle2);

  // --- Lighting -------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xa89878, 0x4a3c28, 1.1);
  scene.add(hemi);

  const windowLight = new THREE.SpotLight(0xffdca0, 7, 13, Math.PI / 4.2, 0.55, 1.1);
  windowLight.position.set(-1.1, 2.3, HALF_D + 1.8);
  windowLight.target.position.set(-0.4, 0, 0.6);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(1024, 1024);
  windowLight.shadow.bias = -0.002;
  scene.add(windowLight, windowLight.target);

  const eastWindowLight = new THREE.SpotLight(0xffdca0, 4, 10, Math.PI / 4.5, 0.6, 1.2);
  eastWindowLight.position.set(HALF_W + 1.6, 2.2, 0.4);
  eastWindowLight.target.position.set(0.8, 0, 0.4);
  scene.add(eastWindowLight, eastWindowLight.target);

  const fill = new THREE.PointLight(0xffb87a, 1.1, 11, 2);
  fill.position.set(0, 2.2, 0);
  scene.add(fill);

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.receiveShadow = true;
  });

  return {
    colliders,
    spawnPoint: { x: 0.3, z: -0.7, yaw: 0.2 },
    fatherPosition: new THREE.Vector3(1.35, 0, 0.55),
    fatherYaw: Math.PI,
    motherPosition: new THREE.Vector3(-2.2, 0, 1.35),
    motherYaw: Math.PI * 0.65,
    tablePosition: new THREE.Vector3(1.3, 0, 1.5),
    clothPosition,
    doorObject: doorMesh,
    doorPivot,
    doorOuterPoint: { x: 0, z: -HALF_D - 1.1, yaw: Math.PI },
    openDoor,
  };
}
