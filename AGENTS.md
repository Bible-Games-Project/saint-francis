<!-- BGP-ADMIN:BEGIN -->
<!-- Managed by bgp-admin (templates/agent-docs). Edits inside this block are overwritten on the next sync. Add project-specific notes below the END marker. -->

# AGENTS.md

Instructions for AI coding agents working on this repository.

This repo is a **web game**. It is published as an iOS/Android app by a separate
control plane called **bgp-admin** — see "Native boundary" below, it is the rule
that matters most here.

Read also:

- [docs/agents/working-style.md](./docs/agents/working-style.md) — how the maintainer likes to work

## Native boundary

bgp-admin owns everything native. It generates the Capacitor setup, the signing
config and the release workflows from outside this repo, without modifying it.

**Never add or edit any of the following here:**

- `capacitor.config.*`, `ios/`, `android/`
- Capacitor or native plugin dependencies in `package.json`
- `.github/workflows/deploy*.yml`, `.github/workflows/preview-deploy.yml`
- Build config (`vite.config.*`, router config, base paths) changed *for the sake
  of the mobile build*

If something only breaks inside the app shell — blank screen in the WebView,
asset paths, deep links, splash screen, versioning, signing — the fix belongs in
bgp-admin, not here. Say so instead of patching around it. A local fix will be
silently overwritten on the next sync and will hide the real bug.

Normal web work (game logic, UI, assets, web build config for web reasons) is
entirely yours.

## Language

Everything you write into the repository MUST be in English:

- Source code (variables, functions, classes, file names)
- Comments of any kind
- Documentation, README files, guides
- Commit messages, branch names, PR and issue titles and descriptions
- Log messages and error messages
- Tests (descriptions, assertions, fixtures)
- Comments inside config files (YAML, JSON, TOML)
- Database schemas and API route names

Only end-user-facing content may be localized: UI strings in i18n files, store
listings, and marketing copy.

The maintainer communicates in Spanish. You may reply in Spanish in
conversation, but anything committed to the repository stays in English.

## Keeping this file current

At the end of a working session, update `AGENTS.md` with everything important
you learned that day. Worth recording:

- Conventions and patterns of this codebase that were not obvious up front
- Commands that actually work (build, test, lint, run) and their gotchas
- Decisions the maintainer made, and the reasoning behind them
- Traps you fell into, so the next agent does not repeat them

Do not record what the code already says, one-off details of a single task, or a
changelog of what you did. This file is for what the next agent needs to know
before starting, nothing else. Keep it edited down — replace stale entries
instead of appending to them.

Write project-specific notes **below the `BGP-ADMIN:END` marker**. Anything
inside the managed block is shared across all game repos and gets overwritten on
the next sync; if a rule you are adding applies to every game, it belongs in
bgp-admin at `templates/agent-docs/`, so ask before adding it.

<!-- BGP-ADMIN:END -->

## Stack

Vite + TypeScript + `three` (WebGL), no UI framework. Plain DOM/CSS for menus
(`src/ui/`), Three.js for the 3D scene (`src/scene/`). No React/Vue — keep it
that way unless the maintainer asks for a framework; the UI is simple enough
that plain DOM has been fine.

Build/dev commands (bun, matches the CI workflow):

```bash
bun install
bun run dev       # local dev server
bun run build     # tsc -b && vite build -> dist/
bun run preview   # serve the dist/ build
```

## Architecture

- `src/scene/` — the 3D world. `SceneManager` owns the renderer/camera/render
  loop and is scene-agnostic; `MainMenuScene.ts` composes environment +
  character entities into it. Everything environmental
  (`scene/environment/*`) and the character (`scene/character/SaintFrancis.ts`)
  is procedural geometry (no model assets) — each factory returns a
  `{ object, update? }` `SceneEntity`.
- `src/ui/` — `UIManager` swaps the two full-screen base screens (`menu`,
  `missions`); Settings is a separate always-mounted modal
  (`ui/screens/SettingsUI.ts`), not part of the UIManager screen stack.
- `src/data/missions.ts` — mission count is one constant (`TOTAL_MISSIONS`);
  the array is generated from it, so adding/removing missions is a one-line
  change. Real unlock/completion state lives in `SaveManager`, not here.
- `src/data/languages.ts` + `src/i18n/` — 12 languages listed, only `en` has a
  populated string table (`i18n/strings.en.ts`). Add a language by adding
  `strings.<code>.ts` + one line in `i18n/i18n.ts`'s `TABLES`, then flip
  `available: true` in `languages.ts`. Never hand-write fake translations.
- `src/systems/SaveManager.ts` — localStorage-backed settings/progress,
  `onChange` subscribers. `src/systems/AudioManager.ts` — no audio assets yet;
  music/SFX are generated with the Web Audio API (oscillators), gated by the
  same settings `SaveManager` persists. Swap in real audio files later by
  changing only `AudioManager`, not the Settings UI.

## Gotchas hit while building the menu

- **`#ui-root > *` and pointer-events**: the base stylesheet forces
  `pointer-events: auto` on every direct child of `#ui-root` (so the 3D canvas
  underneath stays non-interactive by default). Because that's an ID
  selector, it beats a plain class selector's `pointer-events: none` on the
  same element — a hidden full-screen overlay (a modal backdrop, a hidden
  `.ui-screen`) will silently eat clicks meant for whatever's visible under
  it unless its own rule is written as `#ui-root > .the-class` to win on
  specificity. Any new full-screen element mounted directly under `#ui-root`
  needs this pattern.
- **Circular "distant hill" meshes**: `Terrain.ts`'s hill silhouettes are full
  `CircleGeometry` discs pushed back in -Z. If `radius >= distance`, the
  disc's near rim wraps *forward* past the origin and buries foreground
  objects (this happened to the character — looked like the ground had
  swallowed everything below his neck). Keep `radius` well under `distance`
  (comfortable margin, not just `<`).
- Playwright's actionability check treats `aria-disabled="true"` as
  non-clickable even without a real `disabled` attribute — expected, not a
  bug, when testing the locked mission cards (they're intentionally still
  real `<button>`s so a click can trigger the "locked" shake/toast). Use
  `{ force: true }` in tests, don't add a real `disabled`.
- No audio/3D-model assets are checked in; the whole scene and all SFX/music
  are generated in code. If real Synty-style models or composed audio are
  added later, wire them in behind the same `SceneEntity`/`AudioManager`
  interfaces rather than reshaping the call sites.

