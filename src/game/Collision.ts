/**
 * Minimal 2D (ground-plane) collision used by the player and NPCs: circle
 * colliders for props/pillars, axis-aligned boxes for walls. Good enough
 * for a small, mostly-static mission scene — no physics engine needed.
 */

export interface CircleCollider {
  type: "circle";
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider {
  type: "box";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Collider = CircleCollider | BoxCollider;

/** Pushes (x, z) out of any overlapping collider, in place. Returns the corrected point. */
export function resolveCollisions(x: number, z: number, radius: number, colliders: Collider[]): { x: number; z: number } {
  let px = x;
  let pz = z;

  for (const c of colliders) {
    if (c.type === "circle") {
      const dx = px - c.x;
      const dz = pz - c.z;
      const minDist = radius + c.radius;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const push = (minDist - dist) / dist;
        px += dx * push;
        pz += dz * push;
      } else if (distSq <= 1e-8) {
        px += minDist;
      }
    } else {
      const closestX = Math.max(c.minX, Math.min(px, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(pz, c.maxZ));
      const dx = px - closestX;
      const dz = pz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const push = (radius - dist) / dist;
          px += dx * push;
          pz += dz * push;
        } else {
          // Center is inside the box: push out along the shortest axis.
          const left = px - c.minX;
          const right = c.maxX - px;
          const bottom = pz - c.minZ;
          const top = c.maxZ - pz;
          const min = Math.min(left, right, bottom, top);
          if (min === left) px = c.minX - radius;
          else if (min === right) px = c.maxX + radius;
          else if (min === bottom) pz = c.minZ - radius;
          else pz = c.maxZ + radius;
        }
      }
    }
  }

  return { x: px, z: pz };
}

/** True if the point (with the given radius) overlaps any collider. */
export function isBlocked(x: number, z: number, radius: number, colliders: Collider[]): boolean {
  for (const c of colliders) {
    if (c.type === "circle") {
      const minDist = radius + c.radius;
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    } else {
      const closestX = Math.max(c.minX, Math.min(x, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
  }
  return false;
}

/**
 * Casts from (originX, originZ) toward (originX + dirX*maxDist, ...) and
 * returns the furthest distance along that ray that stays clear of every
 * collider — used to keep the follow camera from poking through walls.
 */
export function castClearDistance(
  originX: number,
  originZ: number,
  dirX: number,
  dirZ: number,
  maxDist: number,
  radius: number,
  colliders: Collider[],
  steps = 16,
): number {
  const step = maxDist / steps;
  for (let i = 1; i <= steps; i++) {
    const t = i * step;
    if (isBlocked(originX + dirX * t, originZ + dirZ * t, radius, colliders)) {
      return Math.max(0.5, t - step);
    }
  }
  return maxDist;
}
