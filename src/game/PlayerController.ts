import * as THREE from "three";
import type { HumanRig } from "./character/HumanCharacter";
import type { InputManager } from "./input/InputManager";
import { resolveCollisions, castClearDistance, type Collider } from "./Collision";

const GRAVITY = 16;
const JUMP_SPEED = 5.4;
const PLAYER_RADIUS = 0.3;
const CAMERA_RADIUS = 0.25;

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export interface PlayerControllerOptions {
  rig: HumanRig;
  camera: THREE.PerspectiveCamera;
  input: InputManager;
  walkSpeed?: number;
  runSpeed?: number;
}

/**
 * Simple third-person controller: WASD/arrow movement relative to the
 * camera, a smooth follow camera (mouse-drag horizontal orbit), an arcade
 * jump, and circle/box collision against whatever the current sub-scene
 * registers via `setColliders`.
 */
export class PlayerController {
  private rig: HumanRig;
  private camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private walkSpeed: number;
  private runSpeed: number;

  private position = new THREE.Vector3();
  private yaw = 0;
  private camOrbit = 0;
  private velocityY = 0;
  private grounded = true;
  private colliders: Collider[] = [];
  private locked = false;
  private cameraSnapNext = true;
  private camPos = new THREE.Vector3();

  private cameraDistance = 4.4;
  private cameraHeight = 2.5;

  constructor(opts: PlayerControllerOptions) {
    this.rig = opts.rig;
    this.camera = opts.camera;
    this.input = opts.input;
    this.walkSpeed = opts.walkSpeed ?? 2.4;
    this.runSpeed = opts.runSpeed ?? 4.6;
  }

  setColliders(colliders: Collider[]): void {
    this.colliders = colliders;
  }

  setCameraRig(distance: number, height: number): void {
    this.cameraDistance = distance;
    this.cameraHeight = height;
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
  }

  isLocked(): boolean {
    return this.locked;
  }

  teleport(x: number, z: number, yawRadians: number): void {
    this.position.set(x, 0, z);
    this.yaw = yawRadians;
    this.velocityY = 0;
    this.grounded = true;
    this.cameraSnapNext = true;
    this.rig.object.position.copy(this.position);
    this.rig.object.rotation.y = this.yaw;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getForward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  update(dt: number, elapsed: number): void {
    this.camOrbit -= this.input.consumeDragDeltaX() * 0.006;

    let moveX = 0;
    let moveZ = 0;
    if (!this.locked) {
      if (this.input.isDown("KeyW", "ArrowUp")) moveZ -= 1;
      if (this.input.isDown("KeyS", "ArrowDown")) moveZ += 1;
      if (this.input.isDown("KeyA", "ArrowLeft")) moveX -= 1;
      if (this.input.isDown("KeyD", "ArrowRight")) moveX += 1;
    }

    const hasInput = moveX !== 0 || moveZ !== 0;
    let speedFactor = 0;
    let running = false;

    if (hasInput) {
      const len = Math.hypot(moveX, moveZ);
      moveX /= len;
      moveZ /= len;
      running = this.input.isDown("ShiftLeft", "ShiftRight");

      const camForward = new THREE.Vector3();
      this.camera.getWorldDirection(camForward);
      camForward.y = 0;
      camForward.normalize();
      const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

      const moveDir = new THREE.Vector3()
        .addScaledVector(camForward, -moveZ)
        .addScaledVector(camRight, moveX);
      if (moveDir.lengthSq() > 1e-6) {
        moveDir.normalize();
        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        this.yaw = lerpAngle(this.yaw, targetYaw, Math.min(1, dt * 12));

        const speed = running ? this.runSpeed : this.walkSpeed;
        const desiredX = this.position.x + moveDir.x * speed * dt;
        const desiredZ = this.position.z + moveDir.z * speed * dt;
        const resolved = resolveCollisions(desiredX, desiredZ, PLAYER_RADIUS, this.colliders);
        this.position.x = resolved.x;
        this.position.z = resolved.z;
        speedFactor = running ? 1 : 0.55;
      }
    }

    if (!this.locked && this.input.wasPressed("Space") && this.grounded) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
    }
    this.velocityY -= GRAVITY * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocityY = 0;
      this.grounded = true;
    }

    this.rig.object.position.copy(this.position);
    this.rig.object.rotation.y = this.yaw;
    this.rig.setMotion(speedFactor, running, !this.grounded);
    this.rig.update?.(dt, elapsed);

    // Follow camera: stays behind the character's facing direction, with a
    // small user-controlled orbit offset from mouse drag. The distance is
    // ray-cast against the same colliders as the player so the camera never
    // pokes through a wall in a tight room — it just pulls in closer.
    const camYaw = this.yaw + Math.PI + this.camOrbit;
    const dirX = Math.sin(camYaw);
    const dirZ = Math.cos(camYaw);
    const clearDist = castClearDistance(this.position.x, this.position.z, dirX, dirZ, this.cameraDistance, CAMERA_RADIUS, this.colliders);
    const targetCamPos = new THREE.Vector3(
      this.position.x + dirX * clearDist,
      this.position.y + this.cameraHeight * (clearDist / this.cameraDistance) ** 0.4,
      this.position.z + dirZ * clearDist,
    );
    if (this.cameraSnapNext) {
      this.camPos.copy(targetCamPos);
      this.cameraSnapNext = false;
    } else {
      this.camPos.lerp(targetCamPos, 1 - Math.pow(0.0001, dt));
    }
    this.camera.position.copy(this.camPos);
    const lookTarget = new THREE.Vector3(this.position.x, this.position.y + this.rig.headHeight * 0.82, this.position.z);
    this.camera.lookAt(lookTarget);
  }
}
