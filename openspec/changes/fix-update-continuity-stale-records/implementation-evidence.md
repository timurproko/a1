# Blocked update activation implementation evidence

## Delivered behavior

- Resident continuity discovery now parses the minimal owner process identity before the complete modern owner schema. A record is omitted only when exact PID/start-identity evidence proves that process is gone or PID-reused; live, uninspectable, malformed, wrong-scope, and incompatible records still fail closed.
- A continuity-only activation refusal is preserved as the typed `resident-continuity-blocked` outcome. The update transaction remains active at `certified`, retains bounded internal error evidence, and activation retries reuse the approved pending release without registry lookup, package replacement, materialization, or certification.
- Automatic update state records a durable sanitized `blocked` disposition and retries after fifteen minutes rather than applying the ordinary failed-install cooldown. Invalid prepared proof clears the blocked notice; ordinary retry failures become ordinary failed state.
- The owned shell presents only `Update prepared; activation blocked`, prioritizes copy acknowledgement over that notice, emits no transcript content, and transitions to the existing restart-ready status only after activation succeeds.

## Focused local evidence

- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run check:architecture` passed with reviewed size and startup-graph baseline updates.
- `npm run check:local` passed before the final evidence-only refinements; the affected typecheck and architecture gates were rerun afterward and passed.
- Strict OpenSpec validation passed for `fix-update-continuity-stale-records`.
- 164 focused TypeScript tests passed with one existing skip across resident continuity, update activation/transaction/coordinator behavior, update observation, shell presentation, diagnostics, and Pi status suites.
- Contracts-only native `cargo check --lib` passed with `TERMINAL_HOST_LOCAL_BUILD=1` and `TERMINAL_HOST_CONTRACTS_ONLY=1`.

## Validation boundary

Local native unit execution is environment-blocked: the normal native build cannot find Zig for `libghostty-vt`, while contracts-only test linking fails with unresolved external symbols. No native test pass is claimed from those attempts. The Rust regressions are committed for required exact-head CI, and the available contracts-only compile check passes.

No broad local regression suite or manual product update was used as acceptance evidence. Required final exact-head CI remains authoritative after trusted same-PR finalization.
