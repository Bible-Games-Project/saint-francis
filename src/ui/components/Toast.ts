let hideTimer: number | undefined;

export function showToast(container: HTMLElement, message: string): void {
  let toast = container.querySelector<HTMLDivElement>(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast panel";
    container.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");

  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast?.classList.remove("visible");
  }, 2600);
}
