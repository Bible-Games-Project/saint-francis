import { AudioManager } from "../../systems/AudioManager";

export interface Slider {
  element: HTMLDivElement;
  setDisabled(disabled: boolean): void;
  setValue(value: number): void;
}

/** A pastel, on-theme volume slider (0..1). Native <input type="range"> under the hood for accessibility. */
export function createSlider(initial: number, onChange: (value: number) => void, disabled = false): Slider {
  const wrapper = document.createElement("div");
  wrapper.className = "slider";

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "100";
  input.step = "1";
  input.value = String(Math.round(initial * 100));
  input.disabled = disabled;
  input.className = "slider-input";
  input.setAttribute("aria-label", "Volume");

  const fill = document.createElement("div");
  fill.className = "slider-fill";

  const track = document.createElement("div");
  track.className = "slider-track";
  track.appendChild(fill);

  wrapper.appendChild(track);
  wrapper.appendChild(input);

  const applyFill = () => {
    fill.style.width = `${input.value}%`;
  };
  applyFill();

  input.addEventListener("input", () => {
    applyFill();
    onChange(Number(input.value) / 100);
  });
  input.addEventListener("change", () => AudioManager.playHover());

  wrapper.classList.toggle("disabled", disabled);

  return {
    element: wrapper,
    setDisabled(next: boolean) {
      input.disabled = next;
      wrapper.classList.toggle("disabled", next);
    },
    setValue(value: number) {
      input.value = String(Math.round(value * 100));
      applyFill();
    },
  };
}
