# Implementation evidence

## Application settings and public protocol

Reusable declarations, validation/resolution and shared-file persistence now live under `src/app/settings`. The Settings screen retains a small presentation projection over that application authority. The Pi settings port, bridge and coordinator remain unchanged as engine effect/durability/rollback owners. No extra engine settings are exposed.

`a1 api <request-json>` owns one versioned correlated request/response contract. Only capabilities, supported settings descriptors/read/update and exact active-session snapshots are advertised. Profile Default and session Current are distinct. Default's declaration now accurately states `next-session` in both API and TUI metadata; the profile API's effective value describes future initialization, not a claim about an active runtime.

The dedicated color CLI/adapter is removed. Existing private IPC remains responsible for liveness, nonce, serialization, deadlines and session-generation fencing. Public session operations require both UUIDs, including explicit shell callers. No Pi RPC process, second session writer, public endpoint inventory or subscription is introduced.

## Focused A1 checks actually run

- `npm ci --ignore-scripts` installed the pinned 1.5.2 Pi SDK and repository tooling. Initial typecheck reached bin checks without generated dist; `npm run build` supplied the required build prerequisites, and subsequent typechecks passed.
- After reconciling current `origin/develop` at `9893a86e1`, `npm run build`, `npm run typecheck`, architecture/identity/writer guards and strict OpenSpec validation passed.
- The bounded 25-file selection passed 470 tests: application settings declaration/resolution/persistence, settings sections/manager/colors, integration service, CLI API/dispatch/capabilities, runtime color/Herdr/readiness/startup/wiring, private session-control/address, interactive arguments, Settings UI/startup, and existing Pi settings bridge/coordinator.
- A later metadata/naming correction reran seven affected files: 163 tests passed, along with build, typecheck, naming audit (zero violations), and strict OpenSpec validation. It aligned the Default boundary and retained centralized native-label/product-namespace constants; assertions were not weakened.
- Earlier focused runs also covered the same existing runtime expiry/disconnect/replacement/ambiguity contracts; no broad A1 suite or preflight was run. Draft checks correctly skip product validation; no exact-finalized-head CI success is claimed by these local results.

## External Herdr source delivery

Canonical source remains at `C:/Users/tprokopiev/.config/herdr-app/customizations/`. It is yadm-managed under the home worktree, not an ordinary nested Git repository. Its tracked baseline was clean. Only the 18 task-owned customization paths were staged and committed; no personal preferences or unrelated home paths entered the commit.

Source commit `6cec0e8e` is pushed on `timurproko/MyConfigs` branch `refactor/shared-a1-api`, draft PR #1. The external files are not in A1 PR #939. Changed areas are `src/plugins/api.cjs` (shared Node client), plugin API/build boundary, `src/plugins/a1-colors/*`, explicit-profile command routing hints, customization mappings, fixture tests and docs. Legacy companion source/install commands were retired; existing deployed files and package references were not edited.

The shared client retains explicit executable/npm installation identity, literal arguments, bounded execution, strict LF records, version/correlation/operation/target/readback validation and structured errors. The color worker owns native identity, freshness, membership, descriptor choice validation and best-effort reconciliation. Build-generated compressed workers include the one canonical adapter and policy verbatim and run both as standalone files and remote-style `node -e` sources without source-checkout dependencies. The new `custom.profile.a1-command` label is attached only at explicit terminal birth as a non-authoritative installation routing hint; it is never a legacy identity fallback or label-repair action.

### Herdr checks actually run

- Focused shared-client, plugin-sync, startup, packaging/architecture and actual-candidate wire fixtures passed.
- `npm test` passed the Herdr unit/fixture/deployment suite. The optional cross-project fixture explicitly skipped in that ordinary run without a candidate root; it was separately run successfully with `A1_API_CANDIDATE_ROOT=D:/Git/a1/.worktrees/shared-integration-api`.
- The actual-candidate fixture uses the canonical Herdr adapter and color policy against this checkout's public CLI and disposable runtime processes: capabilities/descriptors, exact snapshots and Current updates, independent sessions, wrong-runtime refusal and stale replacement refusal. No installed user sessions are mutation fixtures.
- `npm run check:host-api` passed for reviewed Herdr 0.1.15. `npm run build` generated 507 customization files for 17 mods. `npm run test:native` passed disposable initial checks, including 17 mods and two retained frame fixtures; it is not interactive certification.
- `npm run doctor` and `npm run check:native` passed against the existing installed deployment. Those checks do not imply that this source candidate was deployed. `npm run deploy` was deliberately not run.

### Existing yadm hook side effect

The normal yadm push unexpectedly ran the existing `.config/yadm/hooks/post_push`. Its local output reported `herdr-shell: already current`, Paseo autostart excluded on this PC, and restarts of AutoHotkey and logi-mouse-follow. The user was notified immediately. Read-only inspection then established that this hook also requests a best-effort peer pull of that peer's own configured upstream; its outcome is unverified. No further yadm mutation or improvised restart/undo was attempted. These hook effects were not requested product behavior, and no agent/Core restart or customization deployment was explicitly invoked by the task.

## Known gaps and rollout disposition

No unfinished implementation scope is accepted. Herdr source/build is ready but deployment is intentionally pending a matching A1 protocol-1 installation on every target machine. Old immutable sessions are skipped, not restarted or repaired. Any explicitly installed legacy companion reference needs owner removal before a future deployment deletes its generated worker. No existing preference values were migrated or reset.

Live desktop interaction, installed-session recoloring, Unix/macOS native execution, A1 publication and protected integration were not performed or certified. Windows/Unix command resolution is fixture-tested; this local execution platform is Windows. Relative explicit A1 paths fail safely for external control; use an absolute installation path rather than guessing a worker cwd. These are documented rollout/validation boundaries, not promises of untested deployment or future operation families.
