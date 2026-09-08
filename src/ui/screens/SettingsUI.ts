import { AudioManager } from "../../systems/AudioManager";
import { SaveManager } from "../../systems/SaveManager";
import { LANGUAGES } from "../../data/languages";
import { setLanguage, t } from "../../i18n/i18n";
import { backIconSvg, checkIconSvg } from "../components/icons";
import { createToggle } from "../components/Toggle";
import { createSlider } from "../components/Slider";
import { showConfirmDialog } from "../components/ConfirmDialog";
import { showToast } from "../components/Toast";

type Tab = "volume" | "language" | "gameData";

export interface SettingsModal {
  open(): void;
  close(): void;
}

function buildVolumeTab(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "settings-pane volume-pane";

  const rows: Array<{ key: "music" | "sounds"; labelKey: "volume.music" | "volume.sounds" }> = [
    { key: "music", labelKey: "volume.music" },
    { key: "sounds", labelKey: "volume.sounds" },
  ];

  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "volume-row";

    const label = document.createElement("span");
    label.className = "volume-label";
    label.textContent = t(row.labelKey);

    const settings = row.key === "music" ? SaveManager.getMusicSettings() : SaveManager.getSoundsSettings();

    const slider = createSlider(settings.volume, (v) => {
      if (row.key === "music") SaveManager.setMusicVolume(v);
      else SaveManager.setSoundsVolume(v);
    }, !settings.enabled);

    const toggle = createToggle(settings.enabled, (checked) => {
      if (row.key === "music") SaveManager.setMusicEnabled(checked);
      else SaveManager.setSoundsEnabled(checked);
      slider.setDisabled(!checked);
    });

    rowEl.append(label, toggle.element, slider.element);
    wrap.appendChild(rowEl);

    // Keep the controls in sync if the data changes elsewhere (e.g. a
    // "Delete All Game Data" reset).
    SaveManager.onChange((data) => {
      const s = row.key === "music" ? data.music : data.sounds;
      toggle.setChecked(s.enabled);
      slider.setValue(s.volume);
      slider.setDisabled(!s.enabled);
    });
  }

  return wrap;
}

function buildLanguageTab(onLanguageChange: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "settings-pane language-pane scroll-y";

  const list = document.createElement("div");
  list.className = "language-list";
  wrap.appendChild(list);

  function render() {
    list.innerHTML = "";
    const current = SaveManager.getLanguage();
    for (const lang of LANGUAGES) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `language-item${lang.available ? "" : " disabled"}${lang.code === current ? " selected" : ""}`;
      item.disabled = !lang.available;

      const name = document.createElement("span");
      name.className = "language-name";
      name.textContent = lang.nativeName;
      item.appendChild(name);

      if (lang.code === current) {
        const check = document.createElement("span");
        check.className = "language-check";
        check.innerHTML = checkIconSvg;
        item.appendChild(check);
      } else if (!lang.available) {
        const soon = document.createElement("span");
        soon.className = "language-soon";
        soon.textContent = t("language.comingSoon");
        item.appendChild(soon);
      }

      item.addEventListener("click", () => {
        if (!lang.available) return;
        AudioManager.playClick();
        SaveManager.setLanguage(lang.code);
        setLanguage(lang.code);
        render();
        onLanguageChange();
      });
      item.addEventListener("pointerenter", () => {
        if (lang.available) AudioManager.playHover();
      });

      list.appendChild(item);
    }
  }

  render();
  return wrap;
}

function buildGameDataTab(container: HTMLElement): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "settings-pane gamedata-pane";

  const hint = document.createElement("p");
  hint.className = "gamedata-hint";
  hint.textContent = t("gameData.deleteHint");

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn-danger";
  deleteBtn.textContent = t("gameData.delete");

  deleteBtn.addEventListener("click", () => {
    AudioManager.playClick();
    showConfirmDialog(container, {
      title: t("gameData.confirmTitle"),
      body: t("gameData.confirmBody"),
      confirmLabel: t("gameData.confirmYes"),
      cancelLabel: t("gameData.confirmNo"),
      onConfirm: () => {
        SaveManager.deleteAllGameData();
        showToast(container, t("gameData.done"));
      },
    });
  });
  deleteBtn.addEventListener("pointerenter", () => AudioManager.playHover());

  wrap.append(hint, deleteBtn);
  return wrap;
}

export function createSettingsModal(container: HTMLElement, onAnySettingChanged: () => void): SettingsModal {
  const backdrop = document.createElement("div");
  backdrop.className = "settings-backdrop";

  const panel = document.createElement("div");
  panel.className = "settings-panel panel";

  const header = document.createElement("div");
  header.className = "settings-header";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon-btn close-btn";
  closeBtn.setAttribute("aria-label", t("settings.back"));
  closeBtn.innerHTML = backIconSvg;

  const title = document.createElement("h2");
  title.className = "settings-title";
  title.textContent = t("settings.title");

  header.append(closeBtn, title);

  const tabs = document.createElement("div");
  tabs.className = "settings-tabs";

  const content = document.createElement("div");
  content.className = "settings-content";

  const tabDefs: Array<{ id: Tab; labelKey: "settings.category.volume" | "settings.category.language" | "settings.category.gameData" }> = [
    { id: "volume", labelKey: "settings.category.volume" },
    { id: "language", labelKey: "settings.category.language" },
    { id: "gameData", labelKey: "settings.category.gameData" },
  ];

  const panes: Record<Tab, HTMLElement> = {
    volume: buildVolumeTab(),
    language: buildLanguageTab(() => onAnySettingChanged()),
    gameData: buildGameDataTab(backdrop),
  };

  let activeTab: Tab = "volume";
  const tabButtons = new Map<Tab, HTMLButtonElement>();

  function setActiveTab(next: Tab) {
    activeTab = next;
    for (const [id, btn] of tabButtons) {
      btn.classList.toggle("active", id === next);
    }
    for (const [id, pane] of Object.entries(panes) as [Tab, HTMLElement][]) {
      pane.classList.toggle("active", id === next);
    }
  }

  for (const def of tabDefs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "settings-tab";
    btn.textContent = t(def.labelKey);
    btn.addEventListener("click", () => {
      AudioManager.playClick();
      setActiveTab(def.id);
    });
    btn.addEventListener("pointerenter", () => AudioManager.playHover());
    tabs.appendChild(btn);
    tabButtons.set(def.id, btn);
    content.appendChild(panes[def.id]);
  }
  setActiveTab(activeTab);

  panel.append(header, tabs, content);
  backdrop.appendChild(panel);
  container.appendChild(backdrop);

  const close = () => {
    AudioManager.playBack();
    backdrop.classList.remove("visible");
  };
  closeBtn.addEventListener("click", close);
  closeBtn.addEventListener("pointerenter", () => AudioManager.playHover());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  return {
    open() {
      setActiveTab("volume");
      backdrop.classList.add("visible");
    },
    close,
  };
}
