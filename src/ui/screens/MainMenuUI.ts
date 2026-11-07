import { AudioManager } from "../../systems/AudioManager";
import { t } from "../../i18n/i18n";
import { gearIconSvg } from "../components/icons";
import { showToast } from "../components/Toast";
import type { Screen } from "../UIManager";

export interface MainMenuUIOptions {
  onPlay: () => void;
  onOpenSettings: () => void;
}

export function createMainMenuScreen(opts: MainMenuUIOptions): Screen {
  const element = document.createElement("div");
  element.className = "menu-screen";

  element.innerHTML = `
    <div class="scrim"></div>
    <div class="menu-titlecard">
      <svg class="menu-emblem" viewBox="0 0 100 100" width="56" height="56" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.55"/>
        <path d="M50 14 L50 86 M30 30 L70 30" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      </svg>
      <h1 class="menu-title">Saint Francis</h1>
      <p class="menu-subtitle">of Assisi</p>
    </div>
    <div class="menu-actions">
      <button type="button" class="btn btn-primary" data-action="play">${t("menu.play")}</button>
      <button type="button" class="btn btn-secondary" data-action="more-games">${t("menu.moreGames")}</button>
    </div>
    <button type="button" class="icon-btn gear-btn" aria-label="${t("menu.settings")}">${gearIconSvg}</button>
  `;

  const playBtn = element.querySelector<HTMLButtonElement>('[data-action="play"]')!;
  const moreGamesBtn = element.querySelector<HTMLButtonElement>('[data-action="more-games"]')!;
  const gearBtn = element.querySelector<HTMLButtonElement>(".gear-btn")!;

  playBtn.addEventListener("click", () => {
    AudioManager.playClick();
    opts.onPlay();
  });

  moreGamesBtn.addEventListener("click", () => {
    AudioManager.playClick();
    showToast(element, "More adventures from the Bible Games Project are on their way.");
  });

  gearBtn.addEventListener("click", () => {
    AudioManager.playClick();
    opts.onOpenSettings();
  });

  [playBtn, moreGamesBtn, gearBtn].forEach((btn) =>
    btn.addEventListener("pointerenter", () => AudioManager.playHover()),
  );

  return { element };
}
