> Archived with unresolved gaps by explicit maintainer authorization. See [acceptance.md](acceptance.md). Checkboxes below preserve the implementation record; checked items are not independent verification of all scenarios. The three unchecked tasks remain incomplete, and delta-spec synchronization was skipped.

## 1. Preserve chip-tagged text in history

- [x] 1.1 Change `PromptChipStore.prepareHistoryText` to return the trimmed authored text with every chip tag preserved verbatim, and verify each chip kind (text-paste, URL, file, folder, Houdini, image) survives the round-trip through `PromptHistoryController.capture`, adjacent-duplicate policy, in-memory recovery, and steer/follow-up/compaction routing.
- [x] 1.2 Verify template and skill invocations still recall as the user's invocation rather than the expanded prompt, that literal placeholder-looking text authored by the user remains unchanged, and that outer trimming and empty-recall handling behave identically to today.

## 2. Rehydrate chips on recall

- [x] 2.1 Add a `PromptChipStore.rehydrateHistoryText` operation that reuses paste-time classification for text-paste (`>10` lines or `>1000` UTF-16 code units), URL, existing-path file/folder, Houdini path, and `[📷 screenshot-<hex>](-resized)?` matches, registering each result in the session chip map so atomic ranges, hyperlink ranges, and submission expansion behave identically to a freshly typed draft.
- [x] 2.2 Hook rehydration into the point where `PromptHistoryController` derives the entry list applied to `editor.recall.replace`; verify recall runs classification once per snapshot entry, not per render, and that `[paste #N]` counters may be freshly allocated per recall.
- [x] 2.3 Verify a URL, existing path, or Houdini-shaped substring in stored text becomes an atomic chip on recall; a `[📁 …]` whose target no longer exists renders as literal path text without a chip; and submission of any recalled draft produces the identical agent prompt regardless of whether the source chip was originally pasted or authored inline.

## 3. Persist image sidecars beside history

- [x] 3.1 Create `<A1 dataDir>/history/<profile-id>-images/` lazily at first sidecar write with `0o700` where supported, and write each sidecar as `<id>.json` containing `{ tag, data, mimeType, savedAt }` with `0o600` where supported; verify existing directory permissions and symlink-hostility policy from `PromptHistoryStore` apply to the sidecar directory.
- [x] 3.2 Wire sidecar writes into the shell submit path after `preparePromptSubmission` succeeds and before `#rememberInput` records the history row; verify writes are idempotent for a repeated `<id>` and that a write failure logs a bounded sanitized event without preventing the history row from committing with its chip-tagged text intact.
- [x] 3.3 Verify that image chips whose sidecars were written are rehydrated into live chips whose bytes match the original submission, and that resubmitting a recalled prompt delivers the same text and the same image attachment the original submission delivered.

## 4. Bind sidecar lifecycle to history retention

- [x] 4.1 Extend `PromptHistoryStore.#prune` to scan each pruned row's text for image chip identifiers and unlink the matching sidecar files inside the retention operation; verify sidecars whose identifiers still appear in another surviving row stay on disk.
- [x] 4.2 Add a bounded orphan sweep at store open that enumerates `<profile-id>-images/*.json`, collects surviving identifiers via one `SELECT text FROM prompts`, and unlinks files whose identifier is not present; verify the sweep is asynchronous with respect to editor readiness, prompt dispatch, and cross-process refresh.
- [x] 4.3 Verify concurrent processes do not lose live sidecars: a lost write race is at worst a redundant write; a retention prune from one process never removes a sidecar still referenced by another process's row.

## 5. Silent stripping on sidecar rehydration failure

- [x] 5.1 Verify rehydration silently strips an image chip tag from the recalled text when its sidecar is missing, unreadable, truncated JSON, or missing required fields, without any placeholder, notice, dead chip, status widget, or reattach hint.
- [x] 5.2 Verify other chips and surrounding text in the same recall value are unaffected by a single sidecar failure, and that rehydration continues for the rest of the entry and for other entries in the snapshot.

## 6. Verify shell lifecycle, retention, and privacy

- [x] 6.1 Exercise ordinary, steering, follow-up, and compaction-queued submissions with each chip kind present; verify captured text preserves the chip layout the user authored, retention pruning removes both rows and their sidecars atomically, and the orphan sweep is idempotent across repeated store opens.
- [x] 6.2 Verify persistence failures degrade only the affected chip: a corrupt sidecar strips only its chip; a directory permission denial prevents new sidecars without preventing new history rows; disabling persistence stops new sidecar writes and reads without deleting existing files.
- [x] 6.3 Verify sanitized diagnostics for sidecar failures never contain chip identifiers, image bytes, prompt text, SQL values, or exception payloads; verify the sidecar directory is excluded from cache/dependency/release cleanup targets alongside the SQLite database.
- [x] 6.4 Verify unchanged native `a1 pi` behavior, unchanged extension `PromptHistoryPort` surface, no new dependency, no SQLite schema change, and no back-fill of legacy expanded rows.

## 7. Validate and hand off the implementation

- [ ] 7.1 Push the separately authorized implementation PR citing this accepted change and report required CI results; leave implementation acceptance pending rather than auto-merging code.
- [ ] 7.2 Deliver the exact implementation worktree/commit and build-first `./scripts/dev` manual command; verify the checklist covers Windows Terminal and Git Bash paste-submit-restart-recall-resubmit for every chip kind, the missing-sidecar strip case, and retention-triggered sidecar cleanup against `./scripts/dev pi`.
- [ ] 7.3 Record explicit user acceptance after physical review and obtain authorized code integration; then synchronize and archive this completed change in a specification-only follow-up, with evidence links for CI and acceptance.
