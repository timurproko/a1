## 1. Upgrade

- [x] 1.1 Pin both Pi packages at 0.85.1 and refresh the lockfile; re-pin `config/startup-graph-baseline.json` (151 files, 1,460,061 bytes; Pi artifact 1,875 files, 8,830,058 bytes).
- [x] 1.2 Re-merge the vendored copies and regenerate the ledger, headers, inventories, resources, and parity evidence.
- [x] 1.3 Resolve every conflict marker (17 hunks in 11 copies), orphaned entry (7 re-anchored to `session-share.js` and `chat-viewport.js`), and unmapped component (`settings-submenu.js`) listed in the pull request; record the five new upstream units as `public-api-reuse`.
- [x] 1.4 Adopt the 0.85.1 public API: `SettingsConfig` fields and callbacks (`modelThinkingLevels`, `fullscreenCopyOnSelect`, `defaultModel`, `availableDefaultModels`, `currentModel`), `ModelSelectorComponent` constructor with `onSelectAsDefault`, `OverlayHandle.getBounds`, split scrollbar styles, `scrollbarTrack`/`scrollbarThumb` as foreground colors, the caller-side built-in renderer merge, capitalized key hints, and the changed models-selector toggle semantics.
- [x] 1.5 Add the `/thinking` route and model-default persistence to the workflow runner and the shell; add per-model thinking rows and choice parts to the owned settings dialog; regenerate `pi-settings-metadata.json` with `model-thinking` and `fullscreen-copy-on-select` mapped and template-literal descriptions handled.
- [x] 1.6 Run the parity generators under the pinned resolver hook; link share URLs in the owned shell; teach the command-outcome fixture the 0.85.1 share flow.

## 2. Proof

- [x] 2.1 Every automated gate passes on the resolved head: `npm run build`, `npm run typecheck`, `npm run check:architecture` (ledger and inventories current), `npm run check:code-documentation`, the changed-documentation check; `npx vitest run test/repository-governance test/contracts test/composition test/integrations test/features test/app test/ui test/cli` passes except for the known contention timeouts that pass alone (`editor-text-paste`, `clipboard-packaged`, `owned-ui graceful quit`, `release command`, `terminal-architecture-policy` at 5 s).
- [x] 2.2 User-visible Pi behavior changes recorded in the proposal's Impact for the release notes; the manual `a1 pi` versus owned-UI comparison of the changed surfaces (settings rows, thinking selector, model picker default action, trust and models markers, share output) remains for the maintainer.
