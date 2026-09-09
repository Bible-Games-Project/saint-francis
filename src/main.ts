import "./style.css";
import * as THREE from "three";
import { SceneManager } from "./scene/SceneManager";
import { buildMainMenuScene } from "./scene/MainMenuScene";
import { UIManager } from "./ui/UIManager";
import { createMainMenuScreen } from "./ui/screens/MainMenuUI";
import { createMissionSelectScreen } from "./ui/screens/MissionSelectUI";
import { createSettingsModal } from "./ui/screens/SettingsUI";
import { AudioManager } from "./systems/AudioManager";
import { setLanguage } from "./i18n/i18n";
import { SaveManager } from "./systems/SaveManager";
import { InputManager } from "./game/input/InputManager";
import { createGameHud } from "./game/hud/GameHud";
import { startMission1, type MissionRuntime } from "./game/missions/mission1/Mission1";

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
  setLoadingProgress(0.4);

  let disposeMainMenu = buildMainMenuScene(manager).dispose;
  setLoadingProgress(0.7);

  const ui = new UIManager(uiRoot);
  const input = new InputManager(canvas);
  const hud = createGameHud();
  ui.register("game", hud.screen);

  let missionRuntime: MissionRuntime | null = null;

  function returnToMissionSelect(): void {
    (document.activeElement as HTMLElement | null)?.blur();
    missionRuntime?.dispose();
    missionRuntime = null;
    manager.scene = new THREE.Scene();
    disposeMainMenu = buildMainMenuScene(manager).dispose;
    ui.show("missions");
  }

  function playMission(missionIndex: number): void {
    if (missionIndex !== 1) return; // only Mission 1 has content so far
    // A focused button (the mission card just clicked) would otherwise
    // still "activate" on the next Space press — Space also being the
    // jump/dialogue-advance key in gameplay.
    (document.activeElement as HTMLElement | null)?.blur();
    disposeMainMenu();
    manager.scene = new THREE.Scene();
    ui.show("game");
    missionRuntime = startMission1(manager, hud, input, {
      onComplete: returnToMissionSelect,
      onExit: returnToMissionSelect,
    });
  }

  const settingsModal = createSettingsModal(uiRoot, () => {
    // Only English is selectable in this first version; hook kept for
    // when additional languages are enabled.
  });

  const missionsScreen = createMissionSelectScreen({
    onBack: () => ui.show("menu"),
    onPlayMission: playMission,
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
