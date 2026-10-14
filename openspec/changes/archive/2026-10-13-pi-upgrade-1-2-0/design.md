# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the pull-request body.

## Reviewed 1.2.0 decisions

The vendored conflicts retain A1's public-package and owned-theme boundaries while adopting Pi's public key identifiers, fake-cursor renderer, and optional compaction-status color callback. Theme and keybinding readers now accept published `$schema` metadata; themes validate the new export colors and continue to reject unsupported fields or color values.

All five newly inventoried features stay `pinned`. A1 consumes Pi's public model registry and built-in codemode extension, keeps Pi's clipboard and extension-run behavior behind the engine boundary, and ships the published theme schema as a tracked public asset. User-visible behavior therefore follows Pi 1.2 for per-key OpenRouter model metadata, remote OSC 52 clipboard delivery, codemode constraints and timing, and extension-triggered run setup. Custom themes may use Pi 1.2 `$schema` and `export` metadata, while focused editor cursors use Pi TUI's marker-based renderer instead of hard-coded reverse-video ANSI.
