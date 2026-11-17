# Implementation evidence

## A1 exact-session name API

- Repository commit: `1b98c857` implements additive name snapshots and revision-guarded manual renames through the existing exact-runtime transport and engine naming owner.
- `npm run build` and `npm run typecheck`: passed.
- Focused Vitest: integration API service/names, Pi adapter, and independent-runtime color/name IPC fixtures: 92 tests passed.
- Native reporting code is unchanged. Adapter fixtures confirm ordinary session-name notifications and manual ownership survive rebind, while stale state cannot rename.

## External Herdr canonical sources

Canonical root: `C:/Users/tprokopiev/.config/herdr-app/customizations/`, tracked separately by yadm in `timurproko/MyConfigs`; these bytes are not part of this A1 tree.

- Local yadm commit `54a7eb8f` (`main`): generic A1 plugin display, master/color/sidebar-rename switches, legacy fallback, color async invalidation, preference fixtures and documentation.
- Changed paths: `src/plugins/a1-colors/{plugin.js,state.js,settings.test.mjs,session-sync.test.mjs}`, `tests/plugins.test.mjs`, `README.md`, `docs/ARCHITECTURE.md` under the canonical root.
- Focused plugin registry, feature settings/preference export and live-color fixtures passed with disposable hosts.
- No generated runtime output was hand-edited; no native reporter, binary, core document, live terminal or agent was changed by these fixtures.

## Delivery state

Implementation continues with sidebar integration. External source is locally committed, not yet pushed/deployed. Existing installed A1 runtimes do not gain the new operation from a source commit. Final rollout/compatibility and UI inspection status will be recorded before the final outcome is checked.
