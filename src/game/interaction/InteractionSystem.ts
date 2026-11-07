import * as THREE from "three";

export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  label: string;
  enabled: boolean;
  onInteract: () => void;
}

export interface InteractableOptions {
  id: string;
  object: THREE.Object3D;
  radius?: number;
  label: string;
  enabled?: boolean;
  onInteract: () => void;
}

/**
 * Finds the nearest enabled interactable within range of the player each
 * frame and reports it so the HUD can show a prompt; fires `onInteract`
 * when the interact key/button is used while one is in range.
 */
export class InteractionSystem {
  private items = new Map<string, Interactable>();
  private current: Interactable | null = null;

  register(opts: InteractableOptions): void {
    this.items.set(opts.id, {
      id: opts.id,
      position: opts.object.getWorldPosition(new THREE.Vector3()),
      radius: opts.radius ?? 1.4,
      label: opts.label,
      enabled: opts.enabled ?? true,
      onInteract: opts.onInteract,
    });
  }

  /** Re-sync a registered item's world position (for objects that move). */
  refreshPosition(id: string, object: THREE.Object3D): void {
    const item = this.items.get(id);
    if (item) object.getWorldPosition(item.position);
  }

  setEnabled(id: string, enabled: boolean): void {
    const item = this.items.get(id);
    if (item) item.enabled = enabled;
  }

  unregister(id: string): void {
    this.items.delete(id);
    if (this.current?.id === id) this.current = null;
  }

  clear(): void {
    this.items.clear();
    this.current = null;
  }

  /**
   * Returns the interactable now in range (or null), and updates `current`.
   * Distance is horizontal-only (X/Z): interactables placed up on a table
   * or a doorframe shouldn't read as "further away" just because their
   * mesh sits above the player's ground-level position.
   */
  update(playerPosition: THREE.Vector3): Interactable | null {
    let nearest: Interactable | null = null;
    let nearestDist = Infinity;
    for (const item of this.items.values()) {
      if (!item.enabled) continue;
      const dx = item.position.x - playerPosition.x;
      const dz = item.position.z - playerPosition.z;
      const d = Math.hypot(dx, dz);
      if (d <= item.radius && d < nearestDist) {
        nearest = item;
        nearestDist = d;
      }
    }
    this.current = nearest;
    return nearest;
  }

  interact(): boolean {
    if (!this.current) return false;
    this.current.onInteract();
    return true;
  }
}
