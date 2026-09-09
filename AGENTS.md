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

- `src/scene/` — the 3D **menu** world only. `SceneManager` owns the
  renderer/camera/render loop and is scene-agnostic (its `.scene` field is
  reassignable — see below); `MainMenuScene.ts` composes environment +
  character entities into it. Everything environmental
  (`scene/environment/*`) is procedural geometry (no model assets) — each
  factory returns a `{ object, update? }` `SceneEntity`.
- `src/game/` — **gameplay** (missions), independent of the menu. See
  "Mission architecture" below.
- `src/scene/character/SaintFrancis.ts` — thin wrapper around
  `game/character/HumanCharacter.ts`'s `createHuman()`, dressed as the
  post-conversion friar (long habit, tonsure) for the menu backdrop. The
  actual rig lives in `game/character/` because missions need it too
  (player, NPCs); don't duplicate character-building code back into
  `scene/`.
- `src/ui/` — `UIManager` swaps three full-screen base screens (`menu`,
  `missions`, `game`); Settings is a separate always-mounted modal
  (`ui/screens/SettingsUI.ts`), not part of the UIManager screen stack. The
  `game` screen's content is `game/hud/GameHud.ts`, created once in
  `main.ts` and reused across mission attempts/replays.
- `src/data/missions.ts` — mission count is one constant (`TOTAL_MISSIONS`);
  the array is generated from it, so adding/removing missions is a one-line
  change. Real unlock/completion state lives in `SaveManager`, not here.
  `MissionSelectUI`'s `PLAYABLE_MISSION_INDICES` set is what actually routes
  a card click to a real mission (`onPlayMission`) vs. the "coming soon"
  toast — add a mission's index there once it has content.
- `src/data/languages.ts` + `src/i18n/` — 12 languages listed, only `en` has a
  populated string table (`i18n/strings.en.ts`). Add a language by adding
  `strings.<code>.ts` + one line in `i18n/i18n.ts`'s `TABLES`, then flip
  `available: true` in `languages.ts`. Never hand-write fake translations.
- `src/systems/SaveManager.ts` — localStorage-backed settings/progress,
  `onChange` subscribers. `completeMission(id)` marks a mission done but
  deliberately does **not** auto-unlock the next one — nothing past Mission
  1 has content yet, so there's nothing to unlock into. When Mission 2
  exists, decide unlock chaining explicitly rather than assuming it's
  automatic. `src/systems/AudioManager.ts` — no audio assets yet; music/SFX
  are generated with the Web Audio API (oscillators), gated by the same
  settings `SaveManager` persists. Swap in real audio files later by
  changing only `AudioManager`, not the Settings UI.

## Mission architecture (`src/game/`)

Reusable, mission-agnostic systems — used by every mission, not just
Mission 1:

- `character/HumanCharacter.ts` — the one humanoid rig (`createHuman(opts)`),
  parametric over garment length/color, headwear, beard, apron, build,
  gender lean. Two-bone legs (hip+knee) and arms (shoulder+elbow) as real
  `THREE.Group` pivots so a procedural walk cycle can drive them directly
  (`rig.setMotion(speedFactor, running, airborne)` each frame, plus
  `rig.playGesture("pickup"|"give"|"greet")` for one-shot layered
  animations). `rig.leftHand` / `rig.rightHand` are real `Object3D`s —
  attach carried props by `.add()`-ing onto them, don't track a separate
  world-position copy.
- `PlayerController.ts` — WASD/arrow movement relative to camera facing,
  smooth third-person follow camera (mouse-drag horizontal orbit only, no
  vertical), arcade jump, circle/box collision (`Collision.ts`) against
  whatever the active sub-scene registers via `setColliders()`. Camera
  distance/height are runtime-adjustable (`setCameraRig`) — missions use a
  tighter rig indoors than outdoors (see gotcha below).
- `interaction/InteractionSystem.ts` — proximity-based: register
  `{ id, object, radius, label, onInteract }`, it finds the nearest enabled
  one in range each frame for the HUD prompt, `interact()` fires it.
- `dialogue/DialogueSystem.ts` + `hud/GameHud.ts` — a linear line queue with
  no DOM of its own; `GameHud` renders it and owns the rest of the mission
  chrome (objective pill, interact prompt, dialogue box, mission-complete
  panel, exit button). `objectives/ObjectiveSystem.ts` is a one-line
  pub/sub the HUD subscribes to.
- `missions/mission1/` — everything specific to Mission 1:
  `buildingParts.ts` (shared low-poly building/furniture kit — reused by
  both `HouseScene.ts` and `StreetScene.ts`), `npcs.ts` (character presets:
  Francis, Pietro, Pica, the customer, background villagers, the cloth
  prop), and `Mission1.ts` which wires it all together (talk to father ->
  pick up cloth -> open door -> walk the street -> deliver -> complete). A
  future Mission 2 should follow the same shape as its own
  `missions/mission2/` directory, reusing everything above.
- The house interior and the street exterior are **two separate
  `THREE.Scene` objects** built up front (`buildHouseScene` /
  `buildStreetScene`), each with its own lighting/fog/background. Going
  through the door swaps `manager.scene` and moves the player rig's
  `Object3D` from one scene graph to the other — much simpler than trying
  to keep one shared coordinate space or reusing one THREE.Scene for both.
  Returning to Mission Select disposes the mission's updater and rebuilds
  the main menu scene from scratch (`manager.scene = new THREE.Scene();
  buildMainMenuScene(manager)`) rather than trying to keep it cached.

## Gotchas hit building the gameplay mission

- **`InteractionSystem` distance must be horizontal-only.** A prop placed at
  table height (y≈0.8) or a door pivot at chest height reads as *further
  away* than a same-radius ground-level NPC if you use full 3D
  `Vector3.distanceTo` — the player's y is always ~0, so a raised object
  gets an artificial distance penalty and can lose to a nearer-but-lower
  interactable that shouldn't have won. Compare `hypot(dx, dz)` only.
- **Follow-camera vs. small rooms.** A fixed "camera N units behind the
  player" breaks the moment N is bigger than the clearance to whatever wall
  is behind the player (very possible in a small interior right after
  spawn) — the camera ends up outside the building looking at the back of a
  wall, i.e. a black screen. Fixed by ray-marching the desired camera
  offset against the same colliders the player uses
  (`Collision.castClearDistance`) and pulling the camera in when it would
  clip; `PlayerController.setCameraRig()` also lets each sub-scene use a
  tighter distance/height indoors than outdoors. Also give the player some
  spawn clearance from the wall behind them — don't spawn right against it.
- **`[hidden]` loses to a same-specificity class rule that sets `display`.**
  Several HUD elements (`.interact-prompt`, `.mission-complete-backdrop`)
  declare `display: flex` directly on the class. The browser's UA rule
  `[hidden]{display:none}` has the same specificity as a single class
  selector, and author styles win ties — so `element.hidden = true` visibly
  did nothing until each such rule got an explicit
  `.the-class[hidden]{display:none}` override (same fix already in place
  for `.dialogue-box`). Any new toggle-by-`hidden` element that also sets
  its own `display` needs this pattern; elements that never set `display`
  don't (`.objective-pill` is fine as-is).
- **A focused button + Space is a hidden re-trigger.** Space doubles as
  jump/dialogue-advance in gameplay. If the DOM element you just clicked
  (e.g. the mission card that launched the mission) still has focus, the
  browser's native "Space activates the focused button" behavior fires
  *again* on the next Space press — observed as the mission silently
  restarting from spawn mid-playthrough. Blur `document.activeElement` at
  every major screen transition (`playMission`, `returnToMissionSelect`),
  and blur inside a button's own click handler if it's likely to be
  followed immediately by keyboard input (the HUD interact-prompt does
  this).
- Playwright's actionability check treats `aria-disabled="true"` as
  non-clickable even without a real `disabled` attribute — expected, not a
  bug, when testing the locked mission cards (they're intentionally still
  real `<button>`s so a click can trigger the "locked" shake/toast). Use
  `{ force: true }` in tests, don't add a real `disabled`.
- For fast iteration on mission logic without fighting camera-relative
  movement blind in a headless browser, it's much more reliable to
  temporarily expose the mission's internal objects on `window` (controller,
  interaction system, a `getState()` closure) from inside the mission file,
  drive it via `page.evaluate` (`controller.teleport(x,z,yaw)`,
  `interaction.interact()`, `hud.requestDialogueAdvance()`), then delete the
  debug block before committing. Confirm removal didn't break anything with
  one final real-click smoke test.

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

