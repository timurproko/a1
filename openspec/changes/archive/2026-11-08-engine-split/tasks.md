# Tasks

## 1. Repository polling

- [x] 1.1 Move branch and pull-request polling, its timer, abort, pending state, probe clock and result into `RepositoryMetadataPoller` (`repository-metadata.ts`) with `start`, `reset`, `dispose` and one change callback; `PiEngineRuntime` starts, resets and disposes it.

## 2. Workflow dispatch

- [x] 2.1 Turn each `#performWorkflow` case into a one-line call to a named private handler or a fixed result.
- [x] 2.2 Move the share workflow and its Radius and gist helpers into `workflow-share.ts`, imported dynamically on the first `/share`.

## 3. View projection

- [x] 3.1 Move the session view projection into `view-state.ts`, merge `diagnostics-state.ts` and `usage-view.ts` into it, and delete the adapter's `configuredTheme()` and `pinnedSettingsSnapshot()` in favour of the settings port.

## 4. Baselines

- [x] 4.1 Lower the size ratchet entries and re-pin the startup graph.
