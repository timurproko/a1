## Why

Herdr cannot safely address bare A1 sessions on Core-only SSH machines without an optional reporting companion, and post-startup matching cannot prevent a saved-Default color flash. A1 should expose its own public live identity and accept an invocation-only color before interactive presentation, without installing extensions or changing machine settings.

## What Changes

- Add noninteractive `a1 session color capabilities`, returning exactly one newline-terminated version-1 JSON object. Advertise `launchColor` and `terminalIdentity` only when their implementations are delivered.
- Add `--session-color <name>` to supported bare-A1 interactive launches, accepting the existing seven-color palette. Carry a validated invocation value through bootstrap and composition, apply it before startup/trust/editor frames, and retain it as the initial-color policy for successful new/resume/fork/import replacements.
- Preserve Default color persistence, authoritative live Current color writes, failed/cancelled replacement behavior, unrelated runtimes, comparison mode, and noninteractive operations. Honor the `--` boundary without interpreting literal prompt payload as options or opening an arbitrary Pi passthrough.
- Automatically publish `a1.session`, `a1.runtime`, and `a1.at` using the local supported `hc label` API when interactive bare A1 has a valid Core terminal context and a ready color endpoint. Add bounded heartbeat, prompt replacement publication, cross-runtime ownership protection, and ownership-checked disposal.
- Document discovery, startup grammar, native labels, legacy compatibility, Core-only remote use, and the manual-launch/new-space first-frame boundary.

## Capabilities

### New Capabilities

None. Public integration and discovery belong to the existing session-color-control capability.

### Modified Capabilities

- `session-color-control`: add capability discovery and automatic Core identity reporting; preserve acknowledged live requests under the invocation replacement policy.
- `launch-profiles`: extend only the supported normal interactive grammar and process-boundary propagation for invocation color and literal option boundaries.
- `owned-ui-settings`: allow an invocation initial-color policy above saved Default while preserving session-local Current color and all durable settings behavior.
- `owned-pi-ui-foundation`: apply the invocation color to the first pre-resource frame and clarify saved Default fallback without weakening project trust.

## Impact

- Production owners: CLI, launch, release bootstrap, owned-UI lifecycle, settings, and composition; shipped launcher entries remain thin adapters.
- Tests mirror those owners and use disposable subprocess/Core fixtures, never existing agents as control targets.
- No new dependencies, companion requirement, customization edits, daemon, TCP listener, terminal-input injection, transcript inspection, or private color-endpoint record discovery.
- Herdr's already implemented consumer contract remains exactly `--session-color`, version-1 discovery, and native `a1.*` labels. No consumer edits are authorized by this proposal.
- This is a planning-only draft. Product code, runnable feature, implementation approval, and merge authority are absent. Continue the same branch/worktree/PR only after explicit plan approval and an implementation request.
