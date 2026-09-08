/**
 * English strings. This is the only fully populated language table in this
 * first version — see src/data/languages.ts. Additional languages should be
 * added as sibling files (strings.es.ts, strings.pt.ts, ...) exporting the
 * same key shape, then registered in src/i18n/i18n.ts.
 */
export const en = {
  "menu.play": "Play",
  "menu.moreGames": "More Games",
  "menu.settings": "Settings",

  "settings.title": "Settings",
  "settings.category.volume": "Volume",
  "settings.category.language": "Language",
  "settings.category.gameData": "Game Data",
  "settings.back": "Back",

  "volume.music": "Music",
  "volume.sounds": "Sounds",

  "language.title": "Language",
  "language.comingSoon": "Coming soon",

  "gameData.delete": "Delete All Game Data",
  "gameData.deleteHint": "This will erase your mission progress and settings on this device.",
  "gameData.confirmTitle": "Delete all game data?",
  "gameData.confirmBody": "Are you sure you want to delete all game data? This cannot be undone.",
  "gameData.confirmYes": "Yes, delete",
  "gameData.confirmNo": "No, keep it",
  "gameData.done": "All game data has been deleted.",

  "missions.title": "Choose Your Journey",
  "missions.back": "Back",
  "missions.locked": "Locked",
  "missions.mission": "Mission",

  "mission.1.title": "The Beginning of a New Life",

  "common.close": "Close",
} as const;

export type StringKey = keyof typeof en;
