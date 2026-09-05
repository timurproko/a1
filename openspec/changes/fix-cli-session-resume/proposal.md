## Why

A1 prints `a1 --session <id>` when exiting, but the installed CLI silently returns success without launching anything for that command. The advertised resume path is disconnected at CLI dispatch, launch argument transport, and ID-to-file resolution. The approved goal is to make future A1 sessions resumable as the pinned Pi actually resumes them, not to recover or modify the user's current conversation.

## What Changes

- Support the normal A1 launch forms `a1 --session <path|id>` and `a1 --session-dir <dir> --session <path|id>`, accepting either option order and documenting them in help.
- Carry a validated, invocation-scoped session selection through release bootstrap and launch containment to the existing owned UI; preserve it across any supported launch retry or handoff.
- Resolve session IDs through pinned Pi's public session APIs within the A1 profile, with current-project precedence, custom-directory support, and pinned cross-project confirmation/fork semantics.
- Restore the selected persisted history and effective session cwd through the pinned Pi's existing public behavior rather than passing an ID directly to `SessionManager.open()` or starting an empty session. Require parity for sessions written by that same pin, including its supported compaction format, not support beyond the shipped Pi runtime.
- Diagnose malformed resume options and failed target resolution instead of silently succeeding. Keep unrelated unsupported grammar quiet.
- Prove a fresh-session create/persist → exit → emitted-hint → installed-entry resume round trip, including quoting, supported compaction restoration, and Windows launch argument forwarding. Use disposable sessions created through the pinned public APIs; no personal-session recovery is acceptance evidence.
- Keep this change focused on the advertised normal A1 resume command. CLI picker/continue aliases (`--resume`, `-r`, `--continue`, `-c`), a `resume` subcommand, comparison-profile CLI expansion, and changes to the existing in-UI `/resume` workflow are not included.

## Capabilities

### New Capabilities

- `cli-session-resume`: Public session selection grammar, Pi-compatible target resolution, restoration, failure behavior, and installed-entry regression evidence.

### Modified Capabilities

- `launch-profiles`: Recognize normal A1 session launches without changing maintenance commands, unsupported-word behavior, or profile isolation.
- `launch-instance-lifecycle`: Preserve validated session selection as invocation-scoped launch metadata across the contained process chain.
- `pi-settings-runtime`: Require an executable round trip for normal A1's existing compact-ID exit hint, not only a string-format assertion.

## Impact

- CLI parsing/help and launch intent (`src/cli`, `src/features/launch`).
- Release bootstrap, guardian entry/containment argument construction, and relevant launch retry/handoff paths (`src/foundation/release`, `src/foundation/launch-guardian`, `bin`).
- Owned UI startup, Pi integration, cwd/trust initialization, and exit-hint generation (`src/composition`, `src/integrations/pi`).
- Future tests at parser, launch transport, Pi integration, and exact-package/installed-entry boundaries, using disposable sessions and isolated profiles.
- `certify-pi-retained-tail-compatibility` is deferred independent work, not a prerequisite. Its unsupported-format reproduction does not block this pinned-Pi parity repair, and this repair does not certify retained-tail support or add a retained-tail rejection/conversion subsystem.
- No Pi dependency upgrade, session-format migration, new renderer, shell command evaluation, or cross-profile data copying. This PR contains planning artifacts only; code and executable tests belong to the subsequent implementation change.
