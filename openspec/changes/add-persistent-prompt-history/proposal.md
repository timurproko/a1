## Why

Bare A1 currently recalls prompts from the loaded conversation and current process, but a fresh agent session does not provide the cross-session recall the user relied on in the v2 prototype. Preserve that proven editor experience while replacing per-prompt JSON files and directory-wide cleanup with bounded, transactional persistence outside user-managed agent resources.

## What Changes

- Add persistent prompt recall to bare `a1`, shared across projects and sessions of the same A1 profile. Keep `a1 pi` on its existing pinned, current-session behavior.
- Preserve v2's newest-first unique history, direction-dependent caret placement, draft restoration, `History n/total` border indicator, and deferred refresh while browsing. Default to the user's v2 setting of 100 entries rather than the prototype's fallback of 10.
- Introduce a source-traced, A1-owned adaptation of the pinned editor core and its necessary non-public editor-local helpers, with typed history hooks. Prove its uncustomized behavior before connecting persistence; the current public Pi editor API cannot supply those hooks without changing draft and undo behavior. Select the adaptation only for the enabled bare-A1 default editor, leaving the comparison and disabled-history paths unchanged.
- Store recall data in a dedicated SQLite database at `<A1 dataDir>/history/<profile-id>.sqlite3`, using the existing product-path resolver and `A1_DATA_DIR`. On Windows the default root is `%LOCALAPPDATA%/a1`. Do not put databases under `~/.a1/agent`, `~/.a1/cache`, release directories, or the control database.
- Persist typed user-authored recall text and bounded provenance, including reusable text-paste content, independently from conversation transcripts, prompt expansion, generated suggestions, credentials, and terminal output.
- Use transactions for deduplication, recency, and retention across concurrent processes; keep disk work off editor input/render paths and preserve local recall when persistence fails.
- Expose profile-local A1 settings for enabling persistence and selecting the 10-100-entry retention limit. Bound bytes and background queues as well as entry count.
- Do not automatically import or modify v2/Pi/Claude history. Image reattachment, search/pickers, favorites, export, and an interactive clear-history command are outside this first release.

## Capabilities

### New Capabilities

- `persistent-prompt-history`: Profile-isolated durable storage, eligible input capture, bounded concurrent persistence, v2 recall interaction, and non-blocking lifecycle/failure behavior.

### Modified Capabilities

- `owned-pi-ui-foundation`: Declare bare A1's source-traced default-editor adaptation, typed history boundary, provenance and independent parity gates, and precise history-only behavioral exception while preserving the `a1 pi` comparison and public extension contracts.
- `owned-ui-settings`: Declare persistent-history enablement and retention settings with explicit application boundaries and profile-local persistence.

## Impact

- New feature owner for prompt-history contracts, profile-key/path policy, SQLite worker/store, and retention orchestration; composition injects its neutral port into the existing Pi-backed session UI.
- Existing session-shell submission capture, editor history synchronization, semantic editor-border presentation, and A1 settings declarations/application wiring will be affected during implementation. The Pi component owner will also own the attributed editor-core adaptation and necessary helper closure, typed collaborator ports, source-ledger coverage, and differential editor tests. This is a bounded source port, not a wrapper around inaccessible private members or a replacement terminal runtime. No installed dependency patching, extension monkey-patching, private Pi distribution imports, or runtime source extraction are permitted.
- Reuse Node's existing `node:sqlite` availability; add no third-party database, lockfile, ORM, or daemon dependency. Do not extend `ControlStore`, supervisor messages, or terminal protocols with prompt content.
- Establish a narrow typed retention policy for reusable user prompts; implementation must update resource/data-policy and ownership documentation and governance without authorizing arbitrary structured-message or terminal-content persistence.
- CI coverage will include independent v2 behavior fixtures, unchanged Pi comparison behavior, real multi-process SQLite contention/recovery, isolated paths/profiles, paste reconstruction, and responsive startup/input. This proposal changes OpenSpec artifacts only; implementation follows separately after plan integration and an explicit request.
