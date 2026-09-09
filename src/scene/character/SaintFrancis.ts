import * as THREE from "three";
import { Palette } from "../../palette";
import { createHuman } from "../../game/character/HumanCharacter";
import type { SceneEntity } from "../utils/types";

const doveMat = new THREE.MeshStandardMaterial({ color: Palette.cream, flatShading: true, roughness: 0.6 });

function buildDove(): THREE.Group {
  const dove = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), doveMat);
  body.scale.set(1.3, 0.9, 0.9);
  dove.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.032, 0), doveMat);
  head.position.set(0.075, 0.03, 0);
  dove.add(head);
  const wingGeo = new THREE.ConeGeometry(0.035, 0.11, 5);
  const wingL = new THREE.Mesh(wingGeo, doveMat);
  wingL.rotation.z = Math.PI / 2;
  wingL.position.set(-0.01, 0.01, 0.05);
  const wingR = wingL.clone();
  wingR.position.z = -0.05;
  dove.add(wingL, wingR);
  dove.userData.wings = [wingL, wingR];
  dove.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.castShadow = true;
  });
  return dove;
}

/**
 * Builds the stylized low-poly Saint Francis character for the main menu
 * backdrop: the shared humanoid rig, dressed as the post-conversion friar
 * (long habit, tonsure), with a small idle animation and a dove resting on
 * his hand. Everything is procedural geometry — no external model assets.
 */
export function createSaintFrancis(): SceneEntity {
  const rig = createHuman({
    skinTone: Palette.skin,
    garmentColor: Palette.habitBrown,
    garmentAccent: 0x3f3324,
    garmentLength: "long",
    headwear: "tonsure",
    heightScale: 1.08,
    build: 1,
  });

  const dove = buildDove();
  dove.position.set(0, 0.11, 0.03);
  dove.rotation.y = -0.4;
  rig.rightHand.add(dove);

  const wings = dove.userData.wings as THREE.Mesh[];

  return {
    object: rig.object,
    update(dt, elapsed) {
      rig.setMotion(0, false, false);
      rig.update?.(dt, elapsed);

      const flap = Math.max(0, Math.sin(elapsed * 1.3));
      const wingFlap = Math.sin(elapsed * 16) * 0.5 * (flap > 0.85 ? 1 : 0.08);
      wings[0].rotation.x = wingFlap;
      wings[1].rotation.x = -wingFlap;
    },
  };
}
