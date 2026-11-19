## 1. Establish the rendering discipline

- [x] 1.1 Add `src/foundation/ui-components/` as a declared owner in
  `scripts/project-structure-policy.mjs` and in the pinned owner list in
  `test/repository-governance/project-structure-policy.test.ts`; verify `npm run check:architecture`
  passes with the new owner
- [x] 1.2 Implement the frame contract: a pane renders into `{ width, height }` and returns exactly
  that many rows within that width, with validation naming the offending pane; verify with unit tests
  for short content, over-wide rows, wrong row counts, and an embedded newline
- [x] 1.3 Implement declared invalidation with revision kinds and a frame cache keyed by revisions and
  rectangle; verify a cached frame is reused while nothing changes, discarded on any revision or
  rectangle change, and never cached for a component that declares no contract

## 2. Presentation primitives

- [x] 2.1 Implement display-width measurement, truncation, and padding that account for wide
  characters, combining marks, zero-width sequences, and styling escapes; verify with unit tests over
  CJK, emoji with joiners, combining accents, and styled text that must not lose its terminator

## 3. The pane contract and its two panes

- [x] 3.1 Implement the pane contract — render into a rectangle, focused keyboard input, pane-local
  mouse coordinates, and invalidation — with a consumed/unconsumed result for input; verify a pane
  receives mouse coordinates relative to its own origin
- [x] 3.2 Implement the grouped list block: rows of group headers, selectable elements, notes and
  spacers, with a sticky group header while the top visible row belongs to a group; verify sticky
  behavior, clamped selection movement that skips unselectable rows, and minimum scrolling to reveal
  the selection
- [x] 3.3 Implement block navigation: forward to the next group's first selectable element, backward
  to the current group's first element then the previous group's, skipping empty groups, with no
  wrap-around; verify each spec scenario including both edges
- [x] 3.4 Implement block reveal: bring the whole group into view where it fits and show it from its
  header where it does not; verify both cases against a viewport smaller than a group
- [x] 3.5 Implement the single-line input with caret movement, insertion, deletion, horizontal
  scrolling, and distinct accept and cancel; verify text wider than the input keeps the caret visible
  and that cancel commits nothing

## 4. Applications and their host

- [x] 4.1 Add `src/foundation/ui-apps/` as a declared owner in the policy and the pinned owner
  list; verify `npm run check:architecture` passes

## 5. Declared shortcuts

## 6. Prove the layer with the settings screen

- [x] 6.1 Build the settings screen as an app over the grouped list block, rendering the existing
  `owned-ui-settings` section model with an A1 section and an Agent section; verify the rendered rows
  derive from the section model alone
- [x] 6.2 Wire its keymap through the shortcut registry — move, block jump, first/last, adjust value,
  accept, filter, close — and verify no key is matched outside a declaration
- [x] 6.3 Route accepted changes through the settings session so an A1 entry writes the document and
  an Agent entry writes through the engine port, reporting a failure rather than showing it as saved;
  verify both backends and the failure path
- [x] 6.4 Add the filter over the single-line input, narrowing rows while preserving group structure;
  verify an empty result reports itself rather than rendering an empty screen

## 7. Declare the replacement and hold the parity line

- [x] 7.1 Add the declared A1-owned surface list — id, owning app, route, and for a replacement the
  pinned route it supersedes — and resolve a slash route against it in the session shell before the
  pinned workflow table; verify a declared route opens its app and every other route stays pinned

## 8. Integrate

- [x] 8.1 Run `npm run typecheck`, `npm run check:architecture`, and the repository-governance suite,
  and confirm all pass with the two new owners
- [x] 8.2 Open the pull request into `develop` and confirm the required development validation check
  passes in CI
- [x] 8.3 Exercise the settings screen manually in a real terminal: open it, navigate by block, filter,
  change an A1 setting and an agent setting, resize, and close; record the observed outcome as this
  change's acceptance evidence
  - Accepted 2026-08-22 by the user across a session of manual driving: opening the screen,
    navigating by block, filtering, changing A1 and agent settings, the value menu, the structured
    dialog, the theme following the terminal appearance, the pointer throughout, and closing.

## 9. Re-homed work

These were declared here and are being done elsewhere, so this change closes without them:

- The component tests this change did not write — the scrollbar and its rails, the app registry, the
  host, and the shortcut registry — move to `derive-engine-settings-and-share-ui-components`, whose
  extraction needs them as its safety net.
- The shortcut listing derived from the registry moves there too, alongside the hint line it shares a
  source with.
- The parity gate — coverage of a superseded surface, classification from the declaration, the failure
  tests, and the untouched vanilla path — moves to `govern-owned-surface-parity`, which is about
  parity governance rather than the component layer.
