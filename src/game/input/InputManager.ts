/**
 * Tracks keyboard state and a simple mouse-drag delta for camera orbiting.
 * One instance lives for the whole app; gameplay code only reads it while a
 * mission is active, so there is nothing to tear down between missions.
 */
export class InputManager {
  private keys = new Set<string>();
  private pressedThisFrame = new Set<string>();

  private dragging = false;
  private lastX = 0;
  dragDeltaX = 0;

  constructor(private target: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) this.pressedThisFrame.add(e.code);
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.dragging = true;
    this.lastX = e.clientX;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragDeltaX += e.clientX - this.lastX;
    this.lastX = e.clientX;
  };

  private onPointerUp = (): void => {
    this.dragging = false;
  };

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  /** True on the exact frame the key went down (edge-triggered, no auto-repeat). */
  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressedThisFrame.has(c));
  }

  /** Consume and return the accumulated horizontal drag since the last call. */
  consumeDragDeltaX(): number {
    const d = this.dragDeltaX;
    this.dragDeltaX = 0;
    return d;
  }

  /** Call once per frame after gameplay code has read this frame's input. */
  endFrame(): void {
    this.pressedThisFrame.clear();
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
  }
}
