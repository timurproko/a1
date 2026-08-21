## 1. Establish the rendering discipline

- [ ] 1.1 Add `src/foundation/owned-ui-components/` as a declared owner in
  `scripts/project-structure-policy.mjs` and in the pinned owner list in
  `test/repository-governance/project-structure-policy.test.ts`; verify `npm run check:architecture`
  passes with the new owner
- [ ] 1.2 Implement the frame contract: a pane renders into `{ width, height }` and returns exactly
  that many rows within that width, with validation naming the offending pane; verify with unit tests
  for short content, over-wide rows, wrong row counts, and an embedded newline
- [ ] 1.3 Implement declared invalidation with revision kinds and a frame cache keyed by revisions and
  rectangle; verify a cached frame is reused while nothing changes, discarded on any revision or
  rectangle change, and never cached for a component that declares no contract

## 2. Presentation primitives

- [ ] 2.1 Implement display-width measurement, truncation, and padding that account for wide
  characters, combining marks, zero-width sequences, and styling escapes; verify with unit tests over
  CJK, emoji with joiners, combining accents, and styled text that must not lose its terminator
- [ ] 2.2 Implement the scrollbar: geometry from content length, viewport height, and scroll position,
  with a minimum one-row thumb clamped inside the track; verify the fits-in-viewport case reserves no
  space and that thumb position and size follow scroll
- [ ] 2.3 Implement rail-scoped hover and drag so two visible scrollbars cannot share state; verify by
  a test driving two rails and asserting hover and drag affect only the addressed one

## 3. The pane contract and its two panes

- [ ] 3.1 Implement the pane contract — render into a rectangle, focused keyboard input, pane-local
  mouse coordinates, and invalidation — with a consumed/unconsumed result for input; verify a pane
  receives mouse coordinates relative to its own origin
- [ ] 3.2 Implement the grouped list block: rows of group headers, selectable elements, notes and
  spacers, with a sticky group header while the top visible row belongs to a group; verify sticky
  behavior, clamped selection movement that skips unselectable rows, and minimum scrolling to reveal
  the selection
- [ ] 3.3 Implement block navigation: forward to the next group's first selectable element, backward
  to the current group's first element then the previous group's, skipping empty groups, with no
  wrap-around; verify each spec scenario including both edges
- [ ] 3.4 Implement block reveal: bring the whole group into view where it fits and show it from its
  header where it does not; verify both cases against a viewport smaller than a group
- [ ] 3.5 Implement the single-line input with caret movement, insertion, deletion, horizontal
  scrolling, and distinct accept and cancel; verify text wider than the input keeps the caret visible
  and that cancel commits nothing

## 4. Applications and their host

- [ ] 4.1 Add `src/foundation/owned-ui-apps/` as a declared owner in the policy and the pinned owner
  list; verify `npm run check:architecture` passes
- [ ] 4.2 Implement app registration by stable identity with replace-on-re-register and a reported
  failure for opening an unregistered identity; verify all three scenarios
- [ ] 4.3 Implement the host: one presented app, size and theme, render requests, close, and
  return-to-previous, mounted full-viewport through the existing runtime overlay; verify with a
  synthetic runtime that resize re-renders and that opening a second app replaces the first
- [ ] 4.4 Implement the explicit close policy: an app may consume an interrupt for its own
  cancellation, and an unconsumed idle interrupt follows the host's declared policy; verify the
  consumed, close-policy, and stay-open scenarios
- [ ] 4.5 Implement input and mouse dispatch to the presented app with unconsumed events continuing to
  the host, and app lifecycle with activate, close, resource release, and failure containment; verify a
  throwing app is closed and the previous surface is restored

## 5. Declared shortcuts

- [ ] 5.1 Implement the shortcut registry: declarations with key, scope, description, and action, and
  dispatch resolved through them; verify in-scope dispatch, out-of-scope pass-through, and undeclared
  pass-through
- [ ] 5.2 Implement conflict detection for the same key in overlapping scopes, naming both
  declarations, including a screen shadowing a global; verify all three scenarios
- [ ] 5.3 Derive the shortcut listing from the registry; verify a newly declared shortcut appears
  without a separate listing edit and that every listed entry dispatches what it describes

## 6. Prove the layer with the settings screen

- [ ] 6.1 Build the settings screen as an app over the grouped list block, rendering the existing
  `owned-ui-settings` section model with an A1 section and an Agent section; verify the rendered rows
  derive from the section model alone
- [ ] 6.2 Wire its keymap through the shortcut registry — move, block jump, first/last, adjust value,
  accept, filter, close — and verify no key is matched outside a declaration
- [ ] 6.3 Route accepted changes through the settings session so an A1 entry writes the document and
  an Agent entry writes through the engine port, reporting a failure rather than showing it as saved;
  verify both backends and the failure path
- [ ] 6.4 Add the filter over the single-line input, narrowing rows while preserving group structure;
  verify an empty result reports itself rather than rendering an empty screen

## 7. Declare the replacement and hold the parity line

- [ ] 7.1 Add the declared A1-owned surface list — id, owning app, route, and for a replacement the
  pinned route it supersedes — and resolve a slash route against it in the session shell before the
  pinned workflow table; verify a declared route opens its app and every other route stays pinned
- [ ] 7.2 Assert the replacement drops no capability: every setting the engine reports is reachable
  from the settings screen; verify by a test that fails when a reported setting is missing
- [ ] 7.3 Make `scripts/run-pi-terminal-parity.mjs` classify checkpoints from the declaration, with no
  hardcoded exclusion list, so the seven `/settings` checkpoints read as superseded; verify the
  classification set is derived from the exported declaration
- [ ] 7.4 Add fast-tier tests for the three parity failure scenarios: an undeclared divergent surface,
  an addition that displaces a pinned surface, and a replacement that drops a superseded capability
- [ ] 7.5 Confirm `a1 pi` is untouched: verify the declaration applies only to the owned UI path and no
  vanilla launch path consults it

## 8. Integrate

- [ ] 8.1 Run `npm run typecheck`, `npm run check:architecture`, and the repository-governance suite,
  and confirm all pass with the two new owners
- [ ] 8.2 Open the pull request into `develop` and confirm the required development validation check
  passes in CI
- [ ] 8.3 Exercise the settings screen manually in a real terminal: open it, navigate by block, filter,
  change an A1 setting and an agent setting, resize, and close; record the observed outcome as this
  change's acceptance evidence
