/** Tracks the mission's single current objective line and notifies the HUD when it changes. */
export class ObjectiveSystem {
  private text: string | null = null;
  private listeners = new Set<(text: string | null) => void>();

  set(text: string | null): void {
    this.text = text;
    this.listeners.forEach((fn) => fn(text));
  }

  get(): string | null {
    return this.text;
  }

  onChange(fn: (text: string | null) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
