## Context

A1 embeds Pi 1.5.2 with an owned UI and independent A1 profile. Firstmate's adapter pins a real executable with type -P, supplies a positional brief and Pi options, probes help/version/catalog, and loads tracked extensions. Its native Windows identity correction is already committed in the separate Firstmate checkout and is read-only here.

## Decisions

1. Keep ordinary A1 command routing and `a1 pi` semantics. Add `bin/pi-compatible.js` and a shipped opt-in pi shim directory; retain npm's sole globally registered a1 command. Users opt into that directory only in a dedicated Firstmate launch environment; inherited PATH supplies the same executable to workers. No global pi bin registration.
2. Keep Pi knowledge in CLI/launch/Pi engine owners and composition wiring, not neutral UI contracts. Use the existing validated argv/startup payload path across immutable release/guardian boundaries; require exact selected-release support and fail closed for old consumers.
3. Identity is engine family, not product branding. Publish AI_AGENT=pi and PI_CODING_AGENT=true before extensions. Clear FM_PI_SESSION_PID/START and parent shell metadata at independent UI process entry, never when creating Firstmate's second in-process AgentSession or ordinary helpers. Firstmate alone publishes/verifies its native ownership evidence.
4. Resolve models and effort from the selected profile's real Pi catalog after explicit extensions register providers. Invocation overrides win over resumed state without rewriting saved defaults. Keep session writer coordination and project trust intact.
5. Help/version do not load extensions with factory side effects. Catalog queries may load trusted/configured and explicit extension factories but must not bind/start a session, replace live host markers, or make an LLM request. Unknown extension flags are accepted only through actual loaded registrations, otherwise rejected.
6. Keep the existing prompt byte bound unless a measured Firstmate brief proves a bounded change necessary. Preserve literal argv, Unicode, quotes and newlines; reject oversized/NUL input.

## Validation strategy

Focused typecheck, changed-owner tests, architecture checks and strict OpenSpec validation only; no broad local preflight/full/release suite. Include real public CLI failures/successes, selected-release transport, disposable packaged-entry smoke and real embedded extension lifecycle. Use only named disposable Firstmate state and exact owned test processes. Live main/worker/concurrency/steering/recovery acceptance is reported separately from deterministic tests; inability to complete it is an explicit gap, never compatibility success. No active user Firstmate state or unrelated terminals are touched.

## Risks and limits

Retained release compatibility must not mistake an old startup parser for support for new options. Extension errors must not silently produce instructionless workers. Native Codex effort flags require a loaded registering extension, not hardcoded claims. Physical terminal/Herdr acceptance requires its existing named-lab guarded procedure. No account/profile fallback, unrelated Firstmate correction, merge, landing or cleanup is authorized.

## Evidence

Initial inspection: A1 0.2.7-dev at 41ab0cfa, pinned Pi 1.5.2. Firstmate branch fix/pi-windows-session-identity clean at a0d4b2072e09e2236891531a0034f622260b23bc. Cleanup sweep: nothing handed off, nothing to prune. Task attached through a1 worktree enter feature/firstmate-pi-compatibility.

Outcome 1: family markers are prepared for both profiles; only bin/ui.js calls independent-host identity initialization before loading any Pi modules. It removes inherited FM_PI_SESSION_PID/START and shell session metadata, with Windows case handling. No in-process SDK session/helper path calls it. Build, source/bin typecheck, 7 focused launch/profile tests, strict OpenSpec validation and architecture/writer/product/ledger checks passed. A type inference defect found after the outcome commit was corrected in a separate follow-up. Firstmate native ownership and live metadata changes remain for real integration acceptance.
