import * as THREE from "three";
import type { SceneEntity } from "../../scene/utils/types";

/**
 * A reusable stylized low-poly humanoid rig: hip/knee legs, shoulder/elbow
 * arms, hands, feet, a separate head, and a garment mesh (short tunic or
 * long robe/dress) draped over the torso. Every character in the game —
 * playable Francis, NPCs, background villagers — is built from this one
 * function with different options, so improving the rig improves everyone
 * at once.
 *
 * Joints are plain THREE.Group pivots (hip, knee, shoulder, elbow) so a
 * simple procedural walk cycle can drive them directly; see `setMotion`.
 */

export type Headwear = "none" | "hair" | "tonsure" | "cap" | "veil" | "hood";
export type GarmentLength = "short" | "long";

export interface HumanOptions {
  skinTone?: number;
  hairColor?: number;
  garmentColor?: number;
  garmentAccent?: number;
  legwearColor?: number;
  shoeColor?: number;
  garmentLength?: GarmentLength;
  headwear?: Headwear;
  beard?: boolean;
  apron?: boolean;
  apronColor?: number;
  heightScale?: number;
  build?: number;
  female?: boolean;
}

export interface HumanRig extends SceneEntity {
  object: THREE.Group;
  /** Head height above the character's feet — used to place speech markers, camera targets, etc. */
  headHeight: number;
  /** World-space hand anchors, for attaching carried props (a bundle of cloth, a dove...). */
  rightHand: THREE.Object3D;
  leftHand: THREE.Object3D;
  setMotion(speedFactor: number, running: boolean, airborne: boolean): void;
  playGesture(kind: "pickup" | "give" | "greet"): void;
}

/** A limb segment (upper arm, forearm, thigh, shin): a subtly bulged lathe
 * shape, not a plain cylinder. Hangs from y=0 (the joint pivot) down to
 * y=-length. */
function limbGeometry(length: number, topR: number, bulgeR: number, botR: number, segments = 7): THREE.BufferGeometry {
  const points = [
    new THREE.Vector2(Math.max(0.012, topR * 0.8), 0),
    new THREE.Vector2(topR, -length * 0.1),
    new THREE.Vector2(bulgeR, -length * 0.42),
    new THREE.Vector2(bulgeR * 0.92, -length * 0.7),
    new THREE.Vector2(botR * 1.08, -length * 0.88),
    new THREE.Vector2(botR, -length),
  ];
  const geometry = new THREE.LatheGeometry(points, segments);
  geometry.computeVertexNormals();
  return geometry;
}

function jointSphere(radius: number, segments = 7): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, segments, Math.max(4, Math.floor(segments * 0.7)));
}

/** The torso garment: tapered chest -> waist -> flared hem. Spans upward
 * (shoulders) and downward (hem) from the hip/waist origin. */
function garmentGeometry(hemY: number, female: boolean, build: number): THREE.BufferGeometry {
  const chestR = 0.225 * build * (female ? 0.96 : 1.04);
  const waistR = 0.185 * build;
  const shoulderR = 0.2 * build;
  const points = [
    new THREE.Vector2(Math.abs(hemY) < 0.3 ? waistR * 1.35 : waistR * 1.55, hemY),
    new THREE.Vector2(waistR * 1.15, hemY * 0.55),
    new THREE.Vector2(waistR, 0),
    new THREE.Vector2(female ? chestR * 1.08 : chestR * 0.94, 0.18),
    new THREE.Vector2(chestR, 0.34),
    new THREE.Vector2(shoulderR, 0.5),
    new THREE.Vector2(0.095, 0.56),
  ];
  const geometry = new THREE.LatheGeometry(points, 10);
  geometry.computeVertexNormals();
  return geometry;
}

function footGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(0.1, 0.09, 0.24, 1, 1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const y = pos.getY(i);
    // Taper the toe (front, +z) and round the top slightly for a soft
    // leather-shoe silhouette instead of a brick.
    if (z > 0) pos.setX(i, pos.getX(i) * 0.72);
    if (y > 0) pos.setX(i, pos.getX(i) * 0.85);
  }
  geo.computeVertexNormals();
  geo.translate(0, 0, 0.05);
  return geo;
}

function handGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.052, 0);
  geo.scale(0.85, 1, 0.95);
  return geo;
}

function buildHead(opts: Required<HumanOptions>, mats: ReturnType<typeof buildMaterials>): { group: THREE.Group; radius: number } {
  const head = new THREE.Group();
  const radius = 0.115 * opts.heightScale;

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), mats.skin);
  skull.scale.set(0.9, 1.06, 0.94);
  head.add(skull);

  const jawGeo = new THREE.ConeGeometry(radius * 0.62, radius * 0.55, 6);
  const jaw = new THREE.Mesh(jawGeo, mats.skin);
  jaw.position.set(0, -radius * 0.82, radius * 0.08);
  jaw.rotation.x = Math.PI;
  head.add(jaw);

  const noseGeo = new THREE.ConeGeometry(radius * 0.17, radius * 0.4, 5);
  const nose = new THREE.Mesh(noseGeo, mats.skin);
  nose.position.set(0, -radius * 0.06, radius * 0.94);
  nose.rotation.x = Math.PI / 2.1;
  head.add(nose);

  const eyeGeo = new THREE.SphereGeometry(radius * 0.1, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, mats.eye);
  eyeL.position.set(-radius * 0.36, radius * 0.1, radius * 0.86);
  const eyeR = eyeL.clone();
  eyeR.position.x = radius * 0.36;
  head.add(eyeL, eyeR);

  const mouthGeo = new THREE.TorusGeometry(radius * 0.26, radius * 0.045, 5, 8, Math.PI * 0.7);
  const mouth = new THREE.Mesh(mouthGeo, mats.mouth);
  mouth.position.set(0, -radius * 0.45, radius * 0.82);
  mouth.rotation.z = Math.PI;
  mouth.rotation.x = 0.3;
  head.add(mouth);

  if (opts.beard) {
    const beardGeo = new THREE.ConeGeometry(radius * 0.5, radius * 0.85, 7);
    const beard = new THREE.Mesh(beardGeo, mats.hair);
    beard.position.set(0, -radius * 0.75, radius * 0.42);
    beard.rotation.x = Math.PI * 0.92;
    head.add(beard);
  }

  switch (opts.headwear) {
    case "hair": {
      const hairGeo = new THREE.IcosahedronGeometry(radius * 1.06, 1);
      const hair = new THREE.Mesh(hairGeo, mats.hair);
      hair.scale.set(0.94, 0.85, 0.98);
      hair.position.y = radius * 0.16;
      head.add(hair);
      const fringeGeo = new THREE.TorusGeometry(radius * 0.92, radius * 0.22, 6, 12, Math.PI);
      const fringe = new THREE.Mesh(fringeGeo, mats.hair);
      fringe.rotation.x = Math.PI / 2;
      fringe.rotation.z = Math.PI;
      fringe.position.set(0, -radius * 0.05, radius * 0.05);
      head.add(fringe);
      break;
    }
    case "tonsure": {
      const tonsure = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.8, radius * 0.09, 6, 16), mats.hair);
      tonsure.rotation.x = Math.PI / 2;
      tonsure.position.y = radius * 0.62;
      head.add(tonsure);
      break;
    }
    case "cap": {
      const capGeo = new THREE.SphereGeometry(radius * 1.08, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const cap = new THREE.Mesh(capGeo, mats.cap);
      cap.position.y = radius * 0.32;
      head.add(cap);
      const brimGeo = new THREE.TorusGeometry(radius * 0.86, radius * 0.1, 5, 16);
      const brim = new THREE.Mesh(brimGeo, mats.cap);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = radius * 0.42;
      head.add(brim);
      break;
    }
    case "veil": {
      const veilGeo = new THREE.ConeGeometry(radius * 1.5, radius * 2.2, 9, 1, true);
      const veil = new THREE.Mesh(veilGeo, mats.veil);
      veil.position.y = -radius * 0.5;
      head.add(veil);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.05, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mats.veil);
      cap.position.y = radius * 0.3;
      head.add(cap);
      break;
    }
    case "hood": {
      const hoodGeo = new THREE.SphereGeometry(radius * 1.15, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62);
      const hood = new THREE.Mesh(hoodGeo, mats.garment);
      hood.position.y = radius * 0.28;
      head.add(hood);
      break;
    }
    case "none":
    default:
      break;
  }

  head.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return { group: head, radius };
}

function buildMaterials(opts: Required<HumanOptions>) {
  return {
    skin: new THREE.MeshStandardMaterial({ color: opts.skinTone, flatShading: true, roughness: 0.65 }),
    hair: new THREE.MeshStandardMaterial({ color: opts.hairColor, flatShading: true, roughness: 0.8 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.35 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x8a5a4a, flatShading: true }),
    garment: new THREE.MeshStandardMaterial({ color: opts.garmentColor, flatShading: true, roughness: 0.88 }),
    garmentShade: new THREE.MeshStandardMaterial({
      color: new THREE.Color(opts.garmentColor).multiplyScalar(0.78).getHex(),
      flatShading: true,
      roughness: 0.88,
    }),
    accent: new THREE.MeshStandardMaterial({ color: opts.garmentAccent, flatShading: true, roughness: 0.7 }),
    legwear: new THREE.MeshStandardMaterial({ color: opts.legwearColor, flatShading: true, roughness: 0.85 }),
    shoe: new THREE.MeshStandardMaterial({ color: opts.shoeColor, flatShading: true, roughness: 0.75 }),
    cap: new THREE.MeshStandardMaterial({ color: opts.hairColor, flatShading: true, roughness: 0.75 }),
    veil: new THREE.MeshStandardMaterial({ color: opts.garmentAccent, flatShading: true, roughness: 0.8 }),
    apron: new THREE.MeshStandardMaterial({ color: opts.apronColor, flatShading: true, roughness: 0.85 }),
  };
}

function buildLeg(
  side: 1 | -1,
  opts: Required<HumanOptions>,
  mats: ReturnType<typeof buildMaterials>,
): { hip: THREE.Group; knee: THREE.Group; thighLen: number; shinLen: number } {
  const build = opts.build;
  const thighLen = 0.4 * opts.heightScale;
  const shinLen = 0.38 * opts.heightScale;

  const hip = new THREE.Group();
  hip.position.set(0.1 * side * opts.heightScale, 0, 0);

  const thigh = new THREE.Mesh(
    limbGeometry(thighLen, 0.09 * build, 0.1 * build, 0.065 * build),
    opts.garmentLength === "long" ? mats.garmentShade : mats.legwear,
  );
  hip.add(thigh);

  const hipJoint = new THREE.Mesh(jointSphere(0.095 * build), mats.legwear);
  hip.add(hipJoint);

  const knee = new THREE.Group();
  knee.position.set(0, -thighLen, 0);
  hip.add(knee);

  const shin = new THREE.Mesh(limbGeometry(shinLen, 0.062 * build, 0.058 * build, 0.04), mats.legwear);
  knee.add(shin);

  const kneeJoint = new THREE.Mesh(jointSphere(0.06 * build), mats.legwear);
  knee.add(kneeJoint);

  const foot = new THREE.Mesh(footGeometry(), mats.shoe);
  foot.position.set(0, -shinLen - 0.045, 0.03);
  foot.scale.setScalar(opts.heightScale);
  knee.add(foot);

  hip.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return { hip, knee, thighLen, shinLen };
}

function buildArm(
  side: 1 | -1,
  shoulderY: number,
  opts: Required<HumanOptions>,
  mats: ReturnType<typeof buildMaterials>,
): { shoulder: THREE.Group; elbow: THREE.Group; upperLen: number; foreLen: number; hand: THREE.Mesh } {
  const build = opts.build;
  const upperLen = 0.24 * opts.heightScale;
  const foreLen = 0.22 * opts.heightScale;
  const long = opts.garmentLength === "long";

  const shoulder = new THREE.Group();
  shoulder.position.set(0.19 * opts.heightScale * side, shoulderY, 0);
  shoulder.rotation.z = 0.08 * side;

  // The bare limb underneath (thin, skin/garment toned) — mostly hidden by
  // the sleeve below, visible only where the sleeve ends.
  const upper = new THREE.Mesh(limbGeometry(upperLen, 0.06 * build, 0.058 * build, 0.05 * build), mats.skin);
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.set(0, -upperLen, 0);
  shoulder.add(elbow);

  const elbowJoint = new THREE.Mesh(jointSphere(0.048 * build), mats.skin);
  elbow.add(elbowJoint);

  const forearm = new THREE.Mesh(limbGeometry(foreLen, 0.05 * build, 0.045 * build, 0.036), mats.skin);
  elbow.add(forearm);

  const hand = new THREE.Mesh(handGeometry(), mats.skin);
  hand.position.set(0, -foreLen - 0.03, 0);
  hand.scale.setScalar(opts.heightScale);
  elbow.add(hand);

  // Sleeve: fabric drape over the limb, following the same shoulder pivot
  // so it swings with the arm. Short tunics get a cap sleeve baring the
  // forearm; long robes get a wide bell sleeve nearly to the wrist.
  const sleeveTopR = 0.1 * build;
  const sleeveLen = long ? upperLen + foreLen * 0.8 : upperLen * 0.62;
  const sleeveBotR = long ? 0.135 * build : 0.082 * build;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(sleeveTopR, sleeveBotR, sleeveLen, 7), mats.garment);
  sleeve.position.y = -sleeveLen / 2;
  shoulder.add(sleeve);

  const shoulderCap = new THREE.Mesh(jointSphere(sleeveTopR * 0.95), mats.garment);
  shoulder.add(shoulderCap);

  shoulder.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return { shoulder, elbow, upperLen, foreLen, hand };
}

const DEFAULTS: Required<HumanOptions> = {
  skinTone: 0xe6b98c,
  hairColor: 0x4a3a26,
  garmentColor: 0x8a6a48,
  garmentAccent: 0x6b4e34,
  legwearColor: 0xcabb98,
  shoeColor: 0x5a4530,
  garmentLength: "short",
  headwear: "hair",
  beard: false,
  apron: false,
  apronColor: 0xc0a878,
  heightScale: 1,
  build: 1,
  female: false,
};

export function createHuman(options: HumanOptions = {}): HumanRig {
  const opts: Required<HumanOptions> = { ...DEFAULTS, ...options };
  const mats = buildMaterials(opts);
  const s = opts.heightScale;

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.78 * s;
  root.add(hips);

  const legL = buildLeg(-1, opts, mats);
  const legR = buildLeg(1, opts, mats);
  hips.add(legL.hip, legR.hip);

  const spine = new THREE.Group();
  hips.add(spine);

  const hemY = opts.garmentLength === "long" ? -0.74 * s : -0.28 * s;
  const garment = new THREE.Mesh(garmentGeometry(hemY, opts.female, opts.build), mats.garment);
  garment.scale.setScalar(s);
  spine.add(garment);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.2 * opts.build * s, 0.018 * s, 6, 16), mats.accent);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.01 * s;
  spine.add(belt);

  if (opts.apron) {
    const apronShape = new THREE.Shape();
    apronShape.moveTo(-0.16, 0);
    apronShape.lineTo(0.16, 0);
    apronShape.lineTo(0.13, -0.5);
    apronShape.lineTo(-0.13, -0.5);
    apronShape.closePath();
    const apronGeo = new THREE.ShapeGeometry(apronShape);
    const apron = new THREE.Mesh(apronGeo, mats.apron);
    apron.scale.setScalar(s);
    apron.position.set(0, 0.1 * s, 0.21 * s);
    apron.rotation.x = -0.15;
    spine.add(apron);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.062 * s, 0.09 * s, 7), mats.skin);
  neck.position.y = 0.585 * s;
  spine.add(neck);

  const headBuild = buildHead(opts, mats);
  headBuild.group.position.y = 0.585 * s + headBuild.radius * 1.05;
  spine.add(headBuild.group);
  const headHeight = hips.position.y + headBuild.group.position.y;

  const shoulderY = 0.52 * s;
  const armL = buildArm(-1, shoulderY, opts, mats);
  const armR = buildArm(1, shoulderY, opts, mats);
  spine.add(armL.shoulder, armR.shoulder);

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // --- Animation state -------------------------------------------------
  let motionSpeed = 0; // 0..1, 1 == full run
  let motionRunning = false;
  let motionAirborne = false;
  let gesture: { kind: string; t: number } | null = null;
  const walkPhase = { v: 0 };

  return {
    object: root,
    headHeight,
    rightHand: armR.hand,
    leftHand: armL.hand,
    setMotion(speedFactor, running, airborne) {
      motionSpeed = THREE.MathUtils.clamp(speedFactor, 0, 1);
      motionRunning = running;
      motionAirborne = airborne;
    },
    playGesture(kind) {
      gesture = { kind, t: 0 };
    },
    update(dt, elapsed) {
      const moving = motionSpeed > 0.02;
      const cadence = motionRunning ? 9 : 6.2;
      if (moving && !motionAirborne) {
        walkPhase.v += dt * cadence * (0.4 + motionSpeed * 0.6);
      } else {
        walkPhase.v += dt * 1.1; // slow idle drift so breathing stays alive
      }
      const t = walkPhase.v;
      const walkBlend = motionAirborne ? 0 : motionSpeed;
      const strideAmp = (motionRunning ? 0.75 : 0.5) * walkBlend;
      const kneeAmp = (motionRunning ? 1.3 : 0.85) * walkBlend;

      // Legs: opposite phase, knee bends during the forward swing.
      const swingL = Math.sin(t);
      const swingR = Math.sin(t + Math.PI);
      legL.hip.rotation.x = swingL * strideAmp;
      legR.hip.rotation.x = swingR * strideAmp;
      legL.knee.rotation.x = Math.max(0, -Math.cos(t) * 0.5 + 0.5) * kneeAmp;
      legR.knee.rotation.x = Math.max(0, -Math.cos(t + Math.PI) * 0.5 + 0.5) * kneeAmp;

      // Arms counter-swing opposite the same-side leg.
      const armAmp = (motionRunning ? 0.6 : 0.38) * walkBlend;
      armL.shoulder.rotation.x = -swingL * armAmp;
      armR.shoulder.rotation.x = -swingR * armAmp;
      armL.elbow.rotation.x = Math.max(0, Math.sin(t) * 0.4) * (motionRunning ? 1 : 0.4) * walkBlend;
      armR.elbow.rotation.x = Math.max(0, Math.sin(t + Math.PI) * 0.4) * (motionRunning ? 1 : 0.4) * walkBlend;

      // Idle breathing + gentle sway, faded out as motion increases.
      const idleFactor = 1 - Math.min(1, walkBlend * 1.6);
      const breathe = Math.sin(elapsed * 1.15) * 0.01 * idleFactor;
      spine.scale.set(1 + breathe * 0.4, 1 + breathe, 1 + breathe * 0.4);
      spine.rotation.y = Math.sin(elapsed * 0.35) * 0.04 * idleFactor;
      headBuild.group.rotation.y = Math.sin(elapsed * 0.5 + 1) * 0.07 * idleFactor;
      headBuild.group.rotation.x = Math.sin(elapsed * 0.7) * 0.018 * idleFactor;

      // Body bob while walking/running.
      hips.position.y = 0.78 * s + Math.abs(Math.sin(t)) * 0.02 * s * walkBlend;
      spine.rotation.x = motionRunning ? 0.12 * walkBlend : 0;

      // Jump pose: tuck both legs slightly, arms out a touch.
      if (motionAirborne) {
        legL.hip.rotation.x = THREE.MathUtils.lerp(legL.hip.rotation.x, 0.35, 0.2);
        legR.hip.rotation.x = THREE.MathUtils.lerp(legR.hip.rotation.x, 0.35, 0.2);
        legL.knee.rotation.x = THREE.MathUtils.lerp(legL.knee.rotation.x, 0.7, 0.2);
        legR.knee.rotation.x = THREE.MathUtils.lerp(legR.knee.rotation.x, 0.7, 0.2);
      }

      // One-shot gestures layer additively on top of the arms.
      if (gesture) {
        gesture.t += dt;
        const dur = 0.65;
        const p = Math.min(1, gesture.t / dur);
        const lift = Math.sin(p * Math.PI); // 0 -> 1 -> 0
        if (gesture.kind === "pickup") {
          armL.shoulder.rotation.x -= lift * 1.1;
          armR.shoulder.rotation.x -= lift * 1.1;
          armL.elbow.rotation.x = Math.max(armL.elbow.rotation.x, lift * 1.3);
          armR.elbow.rotation.x = Math.max(armR.elbow.rotation.x, lift * 1.3);
          spine.rotation.x += lift * 0.35;
        } else if (gesture.kind === "give") {
          armR.shoulder.rotation.x -= lift * 0.9;
          armR.shoulder.rotation.z = THREE.MathUtils.lerp(armR.shoulder.rotation.z, 0.05, lift);
          armR.elbow.rotation.x = Math.max(armR.elbow.rotation.x, lift * 0.9);
        } else if (gesture.kind === "greet") {
          armR.shoulder.rotation.x -= lift * 1.4;
          armR.elbow.rotation.x = Math.max(armR.elbow.rotation.x, lift * 1.6);
          headBuild.group.rotation.x -= lift * 0.15;
        }
        if (p >= 1) gesture = null;
      }
    },
  } satisfies HumanRig;
}
