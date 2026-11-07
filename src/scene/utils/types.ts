import type * as THREE from "three";

/** A self-contained piece of the scene that may animate itself each frame. */
export interface SceneEntity {
  object: THREE.Object3D;
  update?(dt: number, elapsed: number): void;
}

/** Deterministic PRNG (mulberry32) so scattered props stay stable across reloads. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
