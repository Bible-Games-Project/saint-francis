import * as THREE from "three";
import { Palette } from "../../palette";
import type { SceneEntity } from "../utils/types";

const habitMat = new THREE.MeshStandardMaterial({
  color: Palette.habitBrown,
  flatShading: true,
  roughness: 0.85,
});
const habitShadeMat = new THREE.MeshStandardMaterial({
  color: Palette.habitBrownDark,
  flatShading: true,
  roughness: 0.85,
});
const ropeMat = new THREE.MeshStandardMaterial({
  color: 0x3f3324,
  flatShading: true,
  roughness: 0.9,
});
const skinMat = new THREE.MeshStandardMaterial({
  color: Palette.skin,
  flatShading: true,
  roughness: 0.6,
});
const hairMat = new THREE.MeshStandardMaterial({
  color: 0x4a3a26,
  flatShading: true,
  roughness: 0.8,
});
const eyeMat = new THREE.MeshStandardMaterial({
  color: 0x2c2318,
  roughness: 0.4,
});
const doveMat = new THREE.MeshStandardMaterial({
  color: Palette.cream,
  flatShading: true,
  roughness: 0.6,
});

function robeGeometry(): THREE.BufferGeometry {
  // A gentle hourglass profile (wide hem -> narrower waist -> shoulder
  // bump -> neck) so the silhouette reads as a robed figure rather than a
  // plain cone.
  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.6, 0),
    new THREE.Vector2(0.56, 0.09),
    new THREE.Vector2(0.44, 0.5),
    new THREE.Vector2(0.36, 0.95),
    new THREE.Vector2(0.38, 1.25),
    new THREE.Vector2(0.44, 1.55),
    new THREE.Vector2(0.46, 1.68),
    new THREE.Vector2(0.32, 1.86),
    new THREE.Vector2(0.2, 1.98),
    new THREE.Vector2(0.16, 2.05),
  ];
  const geometry = new THREE.LatheGeometry(points, 10);
  geometry.computeVertexNormals();
  return geometry;
}

function buildHead(): THREE.Group {
  const head = new THREE.Group();

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 1), skinMat);
  skull.scale.set(0.92, 1.05, 0.96);
  skull.castShadow = true;
  head.add(skull);

  // Franciscan tonsure: a thin ring of hair circling the head above the
  // brow, leaving the crown bald. A full ring (no gap) avoids visible
  // "cut ends" from the front.
  const tonsure = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.035, 6, 16), hairMat);
  tonsure.rotation.x = Math.PI / 2;
  tonsure.position.y = 0.14;
  tonsure.castShadow = true;
  head.add(tonsure);

  const noseGeo = new THREE.ConeGeometry(0.045, 0.11, 5);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, -0.02, 0.255);
  nose.rotation.x = Math.PI / 2.1;
  head.add(nose);

  const eyeGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.095, 0.03, 0.235);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.095;
  head.add(eyeL, eyeR);

  // A soft, calm closed-mouth line.
  const mouthGeo = new THREE.TorusGeometry(0.07, 0.012, 5, 8, Math.PI * 0.7);
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ color: 0x8a5a4a, flatShading: true }));
  mouth.position.set(0, -0.12, 0.21);
  mouth.rotation.z = Math.PI;
  mouth.rotation.x = 0.3;
  head.add(mouth);

  head.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.castShadow = true;
  });

  return head;
}

function buildArm(side: 1 | -1): THREE.Group {
  const shoulder = new THREE.Group();
  const upperGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.55, 6);
  const upper = new THREE.Mesh(upperGeo, habitMat);
  upper.position.y = -0.27;
  upper.castShadow = true;
  shoulder.add(upper);

  const sleeveGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.18, 6);
  const sleeve = new THREE.Mesh(sleeveGeo, habitShadeMat);
  sleeve.position.y = -0.48;
  sleeve.castShadow = true;
  shoulder.add(sleeve);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), skinMat);
  hand.position.y = -0.6;
  hand.castShadow = true;
  shoulder.add(hand);
  shoulder.userData.hand = hand;

  shoulder.position.set(0.42 * side, 1.72, 0.05);
  shoulder.rotation.z = -0.22 * side;
  return shoulder;
}

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
 * Builds the stylized low-poly Saint Francis character with a small idle
 * animation (breathing, gentle sway, a resting dove that occasionally flaps
 * its wings). Everything is procedural geometry — no external model assets.
 */
export function createSaintFrancis(): SceneEntity {
  const root = new THREE.Group();
  const torsoGroup = new THREE.Group();
  root.add(torsoGroup);

  const robe = new THREE.Mesh(robeGeometry(), habitMat);
  robe.position.y = 0;
  robe.name = "robe";
  torsoGroup.add(robe);

  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.028, 6, 16), ropeMat);
  rope.rotation.x = Math.PI / 2;
  rope.position.y = 1.15;
  torsoGroup.add(rope);

  // Three knots on the cord, symbolic of the Franciscan vows.
  for (let i = 0; i < 3; i++) {
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), ropeMat);
    knot.position.set(0.35, 0.75 - i * 0.14, 0.12);
    torsoGroup.add(knot);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 6), skinMat);
  neck.position.y = 1.88;
  torsoGroup.add(neck);

  const headGroup = buildHead();
  headGroup.position.y = 2.05;
  torsoGroup.add(headGroup);

  const armL = buildArm(-1);
  const armR = buildArm(1);
  torsoGroup.add(armL, armR);
  torsoGroup.updateMatrixWorld(true);

  const dove = buildDove();
  dove.position.copy((armR.userData.hand as THREE.Mesh).getWorldPosition(new THREE.Vector3()));
  dove.position.y += 0.09;
  dove.rotation.y = -0.4;
  torsoGroup.add(dove);

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  const wings = dove.userData.wings as THREE.Mesh[];

  return {
    object: root,
    update(_dt, elapsed) {
      const breathe = Math.sin(elapsed * 1.1) * 0.012;
      torsoGroup.scale.set(1 + breathe * 0.4, 1 + breathe, 1 + breathe * 0.4);
      torsoGroup.position.y = Math.sin(elapsed * 1.1) * 0.01;
      torsoGroup.rotation.y = Math.sin(elapsed * 0.35) * 0.05;
      headGroup.rotation.y = Math.sin(elapsed * 0.5 + 1) * 0.08;
      headGroup.rotation.x = Math.sin(elapsed * 0.7) * 0.02;

      armL.rotation.x = Math.sin(elapsed * 0.9) * 0.03;
      armR.rotation.x = Math.sin(elapsed * 0.9 + 1.2) * 0.02;

      const flap = Math.max(0, Math.sin(elapsed * 1.3));
      const wingFlap = Math.sin(elapsed * 16) * 0.5 * (flap > 0.85 ? 1 : 0.08);
      wings[0].rotation.x = wingFlap;
      wings[1].rotation.x = -wingFlap;
    },
  };
}
