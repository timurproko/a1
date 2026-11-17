# Implementation evidence

## A1 exact-session name API

- Initial API commit `1b98c857`: additive name/revision snapshots, strict revision-guarded manual renames and shared response validation, routed through the existing exact-runtime transport and engine naming owner.
- Follow-up owner-boundary repair removes the integration feature's UI-contract dependency. Optional tool-free name completion is lazy-loaded, preserving the existing startup graph budget without raising limits or changing completion policy.
- Same-text external edits take manual ownership without duplicating the session-name entry. Changed names use ordinary engine persistence and name-change notifications; native program-status reporting code is unchanged.
- `npm run build`, `npm run typecheck`, `npm run check:architecture`, changed-file code-documentation governance and strict OpenSpec validation passed.
- Focused Vitest: integration API service/names, Pi adapter, independent-runtime color/name IPC, automatic naming, native program-status reporter and comparison lifecycle: 149 tests across seven files passed.

## External Herdr canonical sources

Canonical root: `C:/Users/tprokopiev/.config/herdr-app/customizations/`, tracked separately by yadm in `timurproko/MyConfigs`; these bytes are not part of this A1 tree.

- Source commits `54a7eb8f` and `e8bc1c76`, pushed to `feature/herdr-agent-session-names`; consumer draft PR: https://github.com/timurproko/MyConfigs/pull/2.
- `54a7eb8f`: generic A1 display, independent master/color/sidebar-rename switches, explicit legacy fallback, async color invalidation, portable preference fixtures and documentation.
- `e8bc1c76`: generic plugin menu contributions/eligibility, ephemeral inline-edit handoff, mounted Agents-row editor, strict shared name readbacks and bundled worker, native/synthetic fixtures and documentation. Canonical files include `src/ui/agent-rename.js`, `src/features/{agents,menu}/main.js`, `src/plugins/a1-colors/{plugin.js,session-name.js,session-color.cjs}`, `src/plugins/{registry.js,api.cjs}`, `customization.json` and `tools/plugins.mjs` plus their fixtures.
- User-approved UX refinement: rename is in-place, matching Spaces/Tabs selected text, compact check/cancel controls, Enter/Escape and blur/outside cancellation. No modal implementation remains. Compact sidebar expansion and native input creation/focus/release yield outside render. Request state is expiring, claimed once and excluded from portable preferences.
- Disposable fixtures cover legacy preferences, all switch combinations, no redundant color writes, local/remote name routing, strict applied acknowledgement, concurrency conflicts, clicked-not-focused targets, reordered JSON keys, replaced identities, expired requests, cancellation/blur/disable, selected text, stale/double submits, unchanged Pin/Close and no name polling/title overrides.
- Full customization unit suite, host-API audit, build, guarded source-scoped deployment, doctor and all 17 native mod checks passed. Synthetic native Settings, context-menu and inline Agents-row previews were inspected in the real window. Preview hosts prohibit external execution, preference writes and real rename submissions; their temporary mod outputs were removed.
- Latest deployment backup: `1794920102369-29772`. Doctor reports Herdr 0.1.16, reviewed compatibility, no issues; post-preview live status has no errors or overlays. Layouts, preferences, native reporting, terminal topology and running A1/Core processes were not replaced or restarted by deployment.
- The existing yadm push hook independently reported restarting AutoHotkey and logi-mouse-follow helpers; herdr-shell was already current and Paseo autostart was excluded. No manual process-management action was taken.

## Delivery metadata repair

The first finalized-delivery check rejected the archive with `delivery-artifact-missing`: the original manually created proposal omitted `.openspec.yaml`. Added the required spec-driven schema and creation date to the existing archive. Product code, acceptance scenarios and validation requirements are unchanged; trusted automation regenerates the acceptance manifest for the repaired archive.

## Known gaps and disposition

No unresolved implementation gaps. Rollout and optional real-agent interaction remain separate from source completion:

- Read-only discovery confirms the currently installed `a1` CLI does not yet advertise `session.rename`. The new sidebar UI is deployed, but saving a real name requires a new A1 CLI installation **and** target runtime containing this candidate. Old versions fail safely; no compatibility fallback, automatic install, injected input or live-session restart is performed.
- No rename was submitted to a real user agent. Real-agent local/remote save/cancel acceptance can be performed after the matching A1 rollout; fixture and synthetic native evidence is not claimed as a live mutation test.
- Existing vanilla A1-to-Herdr reporting is preserved, not reimplemented or gated by either feature switch. Native reporting regressions passed; no plugin writes titles or stored aliases.
- The consumer source is reviewable in its separate PR and locally deployed; A1 source publication and maintainer integration of either PR are not authorized by implementation approval.
