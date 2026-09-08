import { AudioManager } from "../../systems/AudioManager";

export interface ConfirmDialogOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/** Mounts a modal confirmation dialog into `container` and returns a closer. */
export function showConfirmDialog(container: HTMLElement, opts: ConfirmDialogOptions): () => void {
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "dialog panel";
  dialog.setAttribute("role", "alertdialog");
  dialog.setAttribute("aria-modal", "true");

  const title = document.createElement("h3");
  title.className = "dialog-title";
  title.textContent = opts.title;

  const body = document.createElement("p");
  body.className = "dialog-body";
  body.textContent = opts.body;

  const actions = document.createElement("div");
  actions.className = "dialog-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.textContent = opts.cancelLabel;

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn btn-danger";
  confirmBtn.textContent = opts.confirmLabel;

  actions.append(cancelBtn, confirmBtn);
  dialog.append(title, body, actions);
  backdrop.appendChild(dialog);
  container.appendChild(backdrop);

  requestAnimationFrame(() => backdrop.classList.add("visible"));

  const close = () => {
    backdrop.classList.remove("visible");
    setTimeout(() => backdrop.remove(), 260);
  };

  cancelBtn.addEventListener("click", () => {
    AudioManager.playBack();
    close();
    opts.onCancel?.();
  });
  confirmBtn.addEventListener("click", () => {
    AudioManager.playConfirm();
    close();
    opts.onConfirm();
  });
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      close();
      opts.onCancel?.();
    }
  });
  [cancelBtn, confirmBtn].forEach((b) => b.addEventListener("pointerenter", () => AudioManager.playHover()));

  return close;
}
