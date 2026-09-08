/**
 * Shared pastel / earthy color palette. Both the CSS (src/style.css) and the
 * 3D scene draw from this single source so the UI and the world stay in the
 * same warm, monochromatic family described in the art direction brief.
 */
export const Palette = {
  cream: 0xf4ead4,
  parchment: 0xece0c4,
  beige: 0xe3cfa8,
  stone: 0xcabb98,
  stoneDark: 0xa89877,
  oliveLight: 0x9aa06e,
  olive: 0x7f8a5c,
  oliveDark: 0x616e46,
  moss: 0x6d7d54,
  terracotta: 0xc07f56,
  terracottaDark: 0x9c5f3f,
  habitBrown: 0x8a6a48,
  habitBrownDark: 0x6b4e34,
  skin: 0xe6b98c,
  skyTop: 0xaecbd0,
  skyHorizon: 0xf3d9ad,
  sunGold: 0xf5cf8a,
  hillFar: 0xc9c0a0,
  hillMid: 0xb3ab84,
  hillNear: 0x94986c,
  rock: 0xb7ab8f,
} as const;

/** Same palette expressed as CSS hex strings, for the DOM/UI layer. */
export const CssPalette = {
  cream: "#f4ead4",
  parchment: "#ece0c4",
  beige: "#e3cfa8",
  stone: "#cabb98",
  stoneDark: "#a89877",
  oliveLight: "#9aa06e",
  olive: "#7f8a5c",
  oliveDark: "#616e46",
  terracotta: "#c07f56",
  terracottaDark: "#9c5f3f",
  habitBrown: "#8a6a48",
  habitBrownDark: "#6b4e34",
  ink: "#4a4032",
  inkSoft: "#6b5f4c",
} as const;
