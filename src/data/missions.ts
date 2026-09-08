/**
 * Data-driven mission list. Missions are generated from `TOTAL_MISSIONS` so
 * the count can be changed in one place later (add Mission 21, drop Mission
 * 14, etc.) without touching any UI code.
 *
 * Unlock state here is only the *initial* state for a fresh save. The real,
 * persisted unlock/completion state lives in SaveManager and is merged over
 * this list at read time (see getMissionState in systems/SaveManager.ts).
 */

export interface MissionDefinition {
  id: string;
  index: number;
  /** Key into the string table, so mission titles can be localized later. */
  titleKey: string;
  /** True only for missions available on a brand new save. */
  unlockedByDefault: boolean;
}

export const TOTAL_MISSIONS = 20;

export const MISSIONS: MissionDefinition[] = Array.from(
  { length: TOTAL_MISSIONS },
  (_, i) => {
    const index = i + 1;
    return {
      id: `mission-${index}`,
      index,
      titleKey: `mission.${index}.title`,
      unlockedByDefault: index === 1,
    };
  },
);
