import { AudioManager } from "../../systems/AudioManager";

export interface Toggle {
  element: HTMLButtonElement;
  setChecked(checked: boolean): void;
}

export function createToggle(initial: boolean, onChange: (checked: boolean) => void): Toggle {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "toggle";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", String(initial));

  const knob = document.createElement("span");
  knob.className = "toggle-knob";
  button.appendChild(knob);

  let checked = initial;
  const apply = () => {
    button.classList.toggle("on", checked);
    button.setAttribute("aria-checked", String(checked));
  };
  apply();

  button.addEventListener("click", () => {
    checked = !checked;
    apply();
    AudioManager.playClick();
    onChange(checked);
  });
  button.addEventListener("pointerenter", () => AudioManager.playHover());

  return {
    element: button,
    setChecked(next: boolean) {
      checked = next;
      apply();
    },
  };
}
