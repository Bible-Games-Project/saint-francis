import "./style.css";
import { SceneManager } from "./scene/SceneManager";
import { buildMainMenuScene } from "./scene/MainMenuScene";
import { UIManager } from "./ui/UIManager";
import { createMainMenuScreen } from "./ui/screens/MainMenuUI";
import { createMissionSelectScreen } from "./ui/screens/MissionSelectUI";
import { createSettingsModal } from "./ui/screens/SettingsUI";
import { AudioManager } from "./systems/AudioManager";
import { setLanguage } from "./i18n/i18n";
import { SaveManager } from "./systems/SaveManager";

function setLoadingProgress(fraction: number): void {
  const fill = document.getElementById("loading-bar-fill");
  if (fill) fill.style.width = `${Math.round(fraction * 100)}%`;
}

function hideLoadingScreen(): void {
  const el = document.getElementById("loading-screen");
  el?.classList.add("hidden");
}

function main(): void {
  setLanguage(SaveManager.getLanguage());
  AudioManager.init();

  const canvas = document.getElementById("scene-canvas") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;

  setLoadingProgress(0.15);

  const manager = new SceneManager(canvas);
  setLoadingProgress(0.45);

  buildMainMenuScene(manager);
  setLoadingProgress(0.85);

  const ui = new UIManager(uiRoot);

  const settingsModal = createSettingsModal(uiRoot, () => {
    // Only English is selectable in this first version; hook kept for
    // when additional languages are enabled.
  });

  const missionsScreen = createMissionSelectScreen({
    onBack: () => ui.show("menu"),
  });
  ui.register("missions", missionsScreen);

  const menuScreen = createMainMenuScreen({
    onPlay: () => ui.show("missions"),
    onOpenSettings: () => settingsModal.open(),
  });
  ui.register("menu", menuScreen);

  ui.show("menu");

  manager.start();
  setLoadingProgress(1);

  requestAnimationFrame(() => {
    requestAnimationFrame(hideLoadingScreen);
  });
}

main();
