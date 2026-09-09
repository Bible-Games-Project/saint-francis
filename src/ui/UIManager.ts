export interface Screen {
  element: HTMLElement;
  onShow?(): void;
  onHide?(): void;
  destroy?(): void;
}

type BaseScreenName = "menu" | "missions" | "game";

/**
 * Owns which base screen (main menu / mission select) is visible and
 * handles the fade transition between them. Modal panels (Settings,
 * dialogs, toasts) are layered independently on top by their own callers.
 */
export class UIManager {
  private root: HTMLElement;
  private screens = new Map<BaseScreenName, Screen>();
  private current: BaseScreenName | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  register(name: BaseScreenName, screen: Screen): void {
    screen.element.classList.add("ui-screen");
    this.screens.set(name, screen);
    this.root.appendChild(screen.element);
  }

  show(name: BaseScreenName): void {
    if (this.current === name) return;
    const previous = this.current ? this.screens.get(this.current) : null;
    const next = this.screens.get(name);
    if (!next) return;

    if (previous) {
      previous.element.classList.remove("visible");
      previous.onHide?.();
    }

    // Let the outgoing screen fade before the incoming one takes over,
    // so the two never fight for the viewer's attention mid-transition.
    window.setTimeout(
      () => {
        next.element.classList.add("visible");
        next.onShow?.();
      },
      previous ? 220 : 0,
    );

    this.current = name;
  }
}
