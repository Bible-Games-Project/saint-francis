import { DEFAULT_LANGUAGE } from "../data/languages";
import { MISSIONS } from "../data/missions";

const STORAGE_KEY = "saint-francis.save";
const SAVE_VERSION = 1;

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0..1
}

export interface SaveData {
  version: number;
  language: string;
  music: AudioSettings;
  sounds: AudioSettings;
  /** Mission ids that are unlocked, beyond each mission's default state. */
  unlockedMissionIds: string[];
  /** Mission ids the player has completed. */
  completedMissionIds: string[];
}

function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    language: DEFAULT_LANGUAGE,
    music: { enabled: true, volume: 0.8 },
    sounds: { enabled: true, volume: 0.8 },
    unlockedMissionIds: MISSIONS.filter((m) => m.unlockedByDefault).map((m) => m.id),
    completedMissionIds: [],
  };
}

function loadRaw(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = defaultSave();
    return {
      ...base,
      ...parsed,
      music: { ...base.music, ...parsed.music },
      sounds: { ...base.sounds, ...parsed.sounds },
      unlockedMissionIds: parsed.unlockedMissionIds ?? base.unlockedMissionIds,
      completedMissionIds: parsed.completedMissionIds ?? base.completedMissionIds,
    };
  } catch {
    return defaultSave();
  }
}

let data = loadRaw();
const listeners = new Set<(data: SaveData) => void>();

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode, quota, etc). Settings stay
    // in-memory for the current session; nothing else to do here.
  }
  listeners.forEach((fn) => fn(data));
}

export const SaveManager = {
  getData(): Readonly<SaveData> {
    return data;
  },

  onChange(fn: (data: SaveData) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getLanguage(): string {
    return data.language;
  },
  setLanguage(code: string): void {
    data = { ...data, language: code };
    persist();
  },

  getMusicSettings(): AudioSettings {
    return data.music;
  },
  setMusicEnabled(enabled: boolean): void {
    data = { ...data, music: { ...data.music, enabled } };
    persist();
  },
  setMusicVolume(volume: number): void {
    data = { ...data, music: { ...data.music, volume: clamp01(volume) } };
    persist();
  },

  getSoundsSettings(): AudioSettings {
    return data.sounds;
  },
  setSoundsEnabled(enabled: boolean): void {
    data = { ...data, sounds: { ...data.sounds, enabled } };
    persist();
  },
  setSoundsVolume(volume: number): void {
    data = { ...data, sounds: { ...data.sounds, volume: clamp01(volume) } };
    persist();
  },

  isMissionUnlocked(missionId: string): boolean {
    const def = MISSIONS.find((m) => m.id === missionId);
    return Boolean(def?.unlockedByDefault) || data.unlockedMissionIds.includes(missionId);
  },
  isMissionCompleted(missionId: string): boolean {
    return data.completedMissionIds.includes(missionId);
  },
  unlockMission(missionId: string): void {
    if (data.unlockedMissionIds.includes(missionId)) return;
    data = { ...data, unlockedMissionIds: [...data.unlockedMissionIds, missionId] };
    persist();
  },

  deleteAllGameData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    data = defaultSave();
    persist();
  },
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
