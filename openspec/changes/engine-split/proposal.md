# Proposal

## Why

The Pi engine adapter's collaborators still mix concerns:

- **`PiEngineRuntime` polls repository metadata.** About 100 of its 531 lines, 9 of its 27 fields and three methods poll the git branch and pull request. Its lifecycle, cancellation, generation guard and reset rules are separate from session binding, which is the runtime's actual job. The size ratchet records the class at 28 methods / 27 fields.
- **`PiWorkflowRunner.#performWorkflow` is a 290-line switch.**
  - Most cases contain their whole workflow inline.
  - The `share` case and the Radius share client add about 80 lines, plus share helpers in `workflow-support.ts`.
  - All of it loads at startup, although `/share` is rare and calls the network.
- **The adapter's view projection and its helpers are scattered.**
  - `PiEngineAdapter.view()` is a 38-line pure projection inside the adapter.
  - `diagnostics-state.ts` (30 lines) and `usage-view.ts` (57 lines) each have one importer, `view-state.ts`.
  - `configuredTheme()` and `pinnedSettingsSnapshot()` on the adapter only forward to the settings collaborator, which the settings port already exposes.

## What Changes

- **Repository polling.**
  - A `RepositoryMetadataPoller` (`repository-metadata.ts`) owns the branch and pull-request polling: its timer, abort controller, pending flag, probe clock, git branch reader and result.
  - It exposes `start`, `reset`, `dispose` and `cwd` / `branch` / `pullRequest`, and reports changes through one callback.
  - The runtime starts and resets it and passes it the binding generation it guards on.
- **Workflow dispatch.**
  - Each `#performWorkflow` case becomes one line that calls a named private handler or returns a fixed result, so the dispatcher fits in one screen.
  - The share workflow (Radius and gist paths) and its helpers move to `workflow-share.ts`, which the runner imports dynamically on the first `/share`.
- **View projection.**
  - The session view projection moves from the adapter into `view-state.ts`.
  - `diagnostics-state.ts` and `usage-view.ts` merge into `view-state.ts`.
  - The adapter's `configuredTheme()` and `pinnedSettingsSnapshot()` are deleted; their callers use the settings port.
- **Unchanged.**
  - User-visible behaviour.
  - Workflow results.
  - The adapter's session, workflow and settings ports.
  - The flat session methods (`view`, `flushEvents`, `executeWorkflow` and so on) that hundreds of tests call.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `owned-ux-architecture`: engine collaborators own one concern each, and a rarely used workflow with its own network client loads on first use.

## Impact

- `src/integrations/pi/engine/session-runtime.ts`, `workflow-runner.ts`, `workflow-support.ts`, `adapter.ts`, `view-state.ts` and `host.ts`.
- New `repository-metadata.ts` and `workflow-share.ts`.
- `diagnostics-state.ts` and `usage-view.ts` are removed.
- Engine tests that import the merged modules or call the removed adapter methods.
- The size ratchet entries for `PiEngineRuntime`, `PiEngineAdapter` and `PiWorkflowRunner.#performWorkflow` shrink.
- The startup graph loses at least one file.
