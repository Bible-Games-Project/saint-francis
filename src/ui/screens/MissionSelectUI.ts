import { AudioManager } from "../../systems/AudioManager";
import { SaveManager } from "../../systems/SaveManager";
import { MISSIONS } from "../../data/missions";
import { t } from "../../i18n/i18n";
import { backIconSvg, lockIconSvg, checkIconSvg } from "../components/icons";
import { showToast } from "../components/Toast";
import type { Screen } from "../UIManager";

export interface MissionSelectUIOptions {
  onBack: () => void;
  /** Called for missions that have real playable content (currently just Mission 1). */
  onPlayMission: (missionIndex: number) => void;
}

const PLAYABLE_MISSION_INDICES = new Set([1]);

export function createMissionSelectScreen(opts: MissionSelectUIOptions): Screen {
  const element = document.createElement("div");
  element.className = "missions-screen";

  element.innerHTML = `
    <div class="scrim"></div>
    <div class="missions-header">
      <button type="button" class="icon-btn back-btn" aria-label="${t("missions.back")}">${backIconSvg}</button>
      <h2 class="missions-title">${t("missions.title")}</h2>
      <div class="missions-header-spacer"></div>
    </div>
    <div class="missions-grid scroll-y"></div>
  `;

  const grid = element.querySelector<HTMLDivElement>(".missions-grid")!;
  const backBtn = element.querySelector<HTMLButtonElement>(".back-btn")!;

  function renderGrid(): void {
    grid.innerHTML = "";
    for (const mission of MISSIONS) {
      const unlocked = SaveManager.isMissionUnlocked(mission.id);
      const completed = SaveManager.isMissionCompleted(mission.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `mission-card${unlocked ? " unlocked" : " locked"}${completed ? " completed" : ""}`;
      card.setAttribute("aria-disabled", String(!unlocked));

      const number = document.createElement("span");
      number.className = "mission-number";
      number.textContent = String(mission.index).padStart(2, "0");
      card.appendChild(number);

      const label = document.createElement("span");
      label.className = "mission-label";
      label.textContent = unlocked ? t("missions.mission") + " " + mission.index : t("missions.locked");
      card.appendChild(label);

      if (completed) {
        const check = document.createElement("span");
        check.className = "mission-check";
        check.innerHTML = checkIconSvg;
        card.appendChild(check);
      } else if (!unlocked) {
        const lock = document.createElement("span");
        lock.className = "mission-lock";
        lock.innerHTML = lockIconSvg;
        card.appendChild(lock);
      }

      card.addEventListener("click", () => {
        if (unlocked) {
          if (PLAYABLE_MISSION_INDICES.has(mission.index)) {
            AudioManager.playConfirm();
            opts.onPlayMission(mission.index);
          } else {
            AudioManager.playConfirm();
            showToast(element, `${t("missions.mission")} ${mission.index} — the adventure is being prepared.`);
          }
        } else {
          AudioManager.playBack();
          card.classList.add("shake");
          card.addEventListener("animationend", () => card.classList.remove("shake"), { once: true });
          showToast(element, "Complete the previous missions to unlock this one.");
        }
      });
      card.addEventListener("pointerenter", () => AudioManager.playHover());

      grid.appendChild(card);
    }
  }

  backBtn.addEventListener("click", () => {
    AudioManager.playBack();
    opts.onBack();
  });
  backBtn.addEventListener("pointerenter", () => AudioManager.playHover());

  renderGrid();

  return {
    element,
    onShow() {
      renderGrid();
    },
  };
}
