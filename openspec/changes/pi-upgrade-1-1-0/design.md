# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the pull-request body.

## Reviewed 1.1.0 decisions

The two vendored conflicts retain A1's public-theme, root-keybinding, renderer-fallback, and image-conversion boundaries while adopting Pi's configurable skill padding plus tool `durationMs` and `outputPad` render context. A1 carries the final tool duration through its neutral transcript projection. The API-key inventory anchor now includes Pi's added provider-name argument; the other changed public declarations remain compatible with the existing public adapters.

Claude Haiku 5.5 and both classifier additions stay `pinned` because A1 uses Pi's public model registry, service factory, and built-in codemode extension. The CLI-only `+name`/`-name` tool modifiers are `declined` because A1 owns its CLI grammar and hosted tool loadout. Program status is `owned`: A1 forwards Pi TUI's OSC 7501 terminal contract and reports working, blocked authentication/dialog, completed, failed, aborted, and cleared lifecycle states without exposing prompt or assistant content.
