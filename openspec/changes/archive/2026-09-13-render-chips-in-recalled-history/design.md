## Context

See `proposal.md` for motivation. At base `dd698368`, `PromptChipStore.prepareHistoryText` expands text-paste, URL, file, folder, and Houdini chips to their resolved values and strips image chips to the empty string before the shell hands the recall value to `PromptHistoryController.capture`. The current `persistent-prompt-history` spec codifies both behaviors: recall value is "the user-authored text before template or extension expansion" (expanded chip content, in practice) and the image-bearing scenario requires no live-looking image attachment token in recall. `PromptHistoryStore` persists that value as the primary key of `prompts`, with 100-entry / 1 MiB-per-entry / 8 MiB-per-profile bounds and per-profile SQLite at `<A1 dataDir>/history/<profile-id>.sqlite3`. Cross-process refresh, browsing invariants, and honest-failure semantics are already established.

`PromptChipStore` classifies fresh clipboard content into six chip kinds, allocates monotonic `[paste #N]` identities for text pastes, generates `[📷 screenshot-<10 hex>]` (and `-resized` variants) for image chips, and keeps in-memory maps for chip resolution during the current session only. Detection thresholds for text pastes (more than 10 lines or more than 1,000 UTF-16 code units) are shared with the source-derived native editor. The v2 prototype at `D:/Backups/pi/v2/history` and `D:/Backups/pi/v2/paste` demonstrates that persisting chip-tagged text plus a per-chip payload archive gives the intended recall experience, at the cost of embedded chip identifiers in visible tags, a global paste cache shared across profiles, ad-hoc migrations, and best-effort silent failure handling. The v2-parity architecture with content-hashing, byte budgets, GC locks, and a new capability was explored and rejected in favor of a smaller design that reuses the existing chip owner and inherits history's storage posture.

## Goals / Non-Goals

**Goals:** Show the same chip layout on recall that the user authored at submit time for every chip kind, including image screenshots. Reuse the existing `PromptChipStore` classification path so recall thresholds and chip identity rules stay identical to paste-time behavior. Persist image bytes next to the existing SQLite database with the same profile isolation, ownership posture, and opt-out coupling. Keep the change to one modified capability with no new dependency, no new SQLite column, no new contract capability, and no schema migration. Degrade silently and locally when a single sidecar is unreadable, without blocking history recall or other chips.

**Non-Goals:** No new persistent chip capability or archive service. No content-addressed chip identifiers. No cross-process GC lock, grace window, or reference-counting service. No independent byte budget for sidecars. No first-paste privacy disclosure UX; documentation covers sensitivity. No live/dead chip visual distinction, notice widget, or reattach hint on recall. No back-fill of legacy expanded rows into chip form; existing rows recall as their current expanded text. No change to native `a1 pi`. No new hashing dependency; existing tag identifiers stay session-local random.

## Decisions

### 1. Store chip-tagged text as the recall value

`PromptChipStore.prepareHistoryText` stops expanding registered chips and stops stripping image chips. It returns the trimmed authored text with every chip tag preserved verbatim, matching what the editor rendered. The existing outer trim and template-invocation policy for `persistent-prompt-history` are retained. The `capture` path in `PromptHistoryController` and the wrapper in `SessionShell.#rememberInput` unchanged in shape; they receive the chip-tagged string as `reusable` and continue to route zero-length results through `rememberRecovery`. Draft eligibility, adjacent-duplicate policy, in-memory recovery, and steer/follow-up/compaction routing behave as today.

Alternative rejected: introducing a separate `chip_refs` sidecar column keyed by chip identifier. Adds a schema migration, a new contract shape, and coordination with `PromptHistoryStore.record`'s primary-key duplicate handling, for no observable benefit since chip identifiers already appear inside the persisted text.

### 2. Re-run classification on recall through the existing chip owner

Recall gains one bounded pass over each snapshot entry through a new `PromptChipStore.rehydrateHistoryText` operation. This pass reuses the same classification helpers that `transformPastedContent` already runs: existing-path detection for `[📁 …]` and `[📄 …]` / `[🖼 …]`, `URL_PATTERN` for `[🔗 …]`, the same length threshold for `[paste #N …]`, and Houdini path recognition for `[🟧 …]`. Image chip tags matching the existing `[📷 screenshot-<hex>](-resized)?` shape are registered as image chips whose payloads are looked up via §3. Registrations reuse the session's `#chips` map so the recalled draft's atomic-range, hyperlink-range, and submission-expansion paths behave identically to a freshly typed draft. `[paste #N]` numbers may be freshly allocated per recall and are not required to match the originating session's counter.

Detection is best-effort: a URL, path, or Houdini-shaped substring that the user typed by hand is recognized as a chip on recall the same way it would be if pasted, because its resolved value is the same string either way and submission produces the identical prompt. A `[📁 …]` whose target no longer exists on disk fails classification and renders as its literal path text without a chip; this matches paste-time behavior for nonexistent paths. Rehydration is invoked once at the point where `PromptHistoryController` derives the entry list applied to `editor.recall.replace`, not on every render.

Alternative rejected: a separate recall-only detection library duplicating the paste-time thresholds. Guarantees drift between paste and recall over time and doubles the test surface.

### 3. Persist image sidecars in a per-profile directory inside history

Image chip payloads are written to `<A1 dataDir>/history/<profile-id>-images/<id>.json` at submit time, where `<id>` is the hex identifier already embedded in the tag (`screenshot-<id>` or `screenshot-<id>-resized`). The sidecar file contains `{ tag, data (base64), mimeType, savedAt }`. The directory is created lazily with `0o700` on Unix and the same permission posture as `<A1 dataDir>/history/` on Windows; sidecar files use `0o600` where supported. The `-images` suffix keeps the sidecar directory a sibling of the SQLite database in the same `history/` root, so existing profile-isolation, opt-out, and cleanup exclusions apply unchanged.

Writes happen from the shell's submit path after `preparePromptSubmission` succeeds and before `#rememberInput` records the history row, so a sidecar exists on disk before its referencing row is durable. Writes are idempotent: an existing sidecar with the same `<id>` is left in place. A write failure is logged as a bounded sanitized event and the history row still commits with its chip-tagged text intact; the row will later behave as if the sidecar is missing, per §5.

Alternative rejected: storing bytes inline in the SQLite `prompts` row as a BLOB column. Simpler atomicity, but interacts with the 1 MiB per-entry text budget (would either need a separate byte budget or would perpetually push text-only entries below the current 1 MiB cap once an image is present), forces a schema migration, and complicates streaming reads. Filesystem sidecars keep SQLite lean and match the sidecar posture already documented for the WAL/SHM files.

Alternative rejected: content-addressed filenames (BLAKE3 or SHA-256 of payload). Enables dedup and race-free `O_CREAT|O_EXCL` writes, but the existing tag identifier is already random per submission and never overlaps in practice; the additional native dependency (BLAKE3) or CPU cost (SHA-256 on multi-MiB images at every paste) is not justified for the observed problem.

### 4. Bind sidecar lifecycle to history retention with no independent policy

Retention pruning in `PromptHistoryStore.#prune` gains a step that scans each pruned row's text for image chip identifiers and unlinks the matching sidecar files inside the same SQL transaction boundary as the `DELETE FROM prompts`. Sidecars whose identifiers still appear in another surviving row's text stay on disk. No age policy, no independent byte budget, and no LRU eviction apply to sidecars.

Store open runs one bounded orphan sweep: enumerate `<profile>-images/*.json`, collect the identifier set that still appears in any surviving row's text via a single `SELECT text FROM prompts`, and unlink files whose identifier is not present. The sweep is asynchronous with respect to editor readiness and prompt dispatch, matching the existing "refresh does not destabilize browsing or startup" invariant. Sweep errors are logged sanitized and do not block startup.

Cross-process safety follows the same story as SQLite pruning: SQL-level `BEGIN IMMEDIATE` serializes retention, and each process's post-transaction unlinks touch only the identifiers that transaction pruned. A concurrent process that just wrote the same identifier for a different row will re-create the sidecar before its own commit; a lost race means one write is redundant, never that a live row loses its sidecar.

Alternative rejected: reference counting in SQLite via a `chip_refs` table. Adds coordination surface (write ordering, count decrement on prune, integrity constraints) without observable benefit given retention is already the sole lifetime driver.

### 5. Missing or unreadable sidecar silently strips the chip

When rehydration in §2 encounters an image chip tag whose sidecar file is missing, unreadable, truncated JSON, or missing required fields, the tag is removed from the recalled text before it reaches the editor. No placeholder, no dead chip, no notice, no reattach hint, no status widget. Other chips in the same recall value and surrounding text are unaffected. Rehydration proceeds for the rest of the entry.

This is the sole failure surface visible to the user for the sidecar directory. All other failures (permission denied, directory missing, filesystem full at write time) are logged sanitized and either prevent the sidecar from existing (recall behaves as the missing case) or leave prior state intact.

Alternative rejected: showing a `[📷 missing]` dead chip, a refuse-to-submit hard error, or a status-widget notice. The user explicitly requested the leanest degradation with no extra messages; a chip that silently disappears from a rare-failure recall matches that direction and matches how today's recall silently drops the image entirely.

### 6. Reuse existing test seams and add focused round-trip coverage

Unit coverage for `PromptChipStore.prepareHistoryText` and the new `rehydrateHistoryText` operation exercises each chip kind, the trimming policy, unregistered-marker preservation, and the image-sidecar missing case, without touching the filesystem for non-image chips. Integration coverage exercises the shell path: paste, submit, restart the store, recall, resubmit, and assert the agent receives the identical prompt and identical image bytes. Sidecar directory tests cover retention-triggered unlinks, the orphan sweep at open, and permission/EEXIST edge cases.

No native `a1 pi` behavior, no `PromptHistoryPort` shape, and no `PromptChipStore` public surface consumed by extensions changes; text-paste chip identity and image chip tag format remain as they are today.

## Risks / Trade-offs

- [Detection is more permissive on recall than at paste time] → A hand-typed URL or existing path becomes a chip on recall even though it was never a chip when submitted. Cosmetic only: submission of the recalled draft produces the identical prompt because the chip resolves to the same string. Documented in the recall requirement so behavior is not surprising.
- [`[paste #N]` numbering may shift across sessions] → Recall re-allocates identities from the current session's counter. Cosmetic; identity is not part of the durable contract and no submission behavior depends on it.
- [File/folder chips depend on live filesystem state] → A recalled `[📁 src]` whose target folder was deleted renders as its literal path text on recall. Matches paste-time behavior and preserves submission integrity. Users see a visible degradation, not a silent one.
- [Image sidecar directory grows with history retention] → Worst case is `history_max_entries × per_prompt_image_count × per_image_byte_cap`. With defaults (100 entries, up to 8 images per prompt, current per-image caps enforced elsewhere), the ceiling is real but not adversarial. `persistent-prompt-history` opt-out already covers user intent to reclaim disk; documentation calls out that sidecar bytes count against the same posture.
- [A sidecar write racing with retention could leave orphaned files] → The orphan sweep at store open reclaims them within one bounded startup pass; no additional GC cycle needed.
- [Existing rows recall as their current expanded text] → No back-fill or migration. Users see chip layout on recall only for prompts submitted after this change lands. Documented in tasks; acceptable per the lean scope.
- [Aggressive recall re-chipping vs. literal placeholder-looking text authored by the user] → The existing "literal placeholder-looking text authored by the user SHALL remain unchanged" scenario is retained. Recall re-classification uses the same existence checks and URL patterns as paste-time, which do not fire on plain chip-label-shaped text without a valid target; a hand-typed `[📁 foo]` where no `foo` exists stays literal. Test coverage confirms.

## Migration Plan

No schema migration. No sidecar back-fill. Rows persisted before this change is deployed continue to recall as their stored expanded text; the recall re-classification pass runs on them too, so a stored URL or existing path may now render as a chip even though the original row was written without one. Behavior on submission is identical to today.

After this specification integrates and implementation is explicitly authorized, implementation lands in a separate stream citing this change. Required CI validates the implementation; focused local tests are debugging aids, not a replacement gate. Physical Windows Terminal / Git Bash review confirms: paste every chip kind (text-paste, URL, file, folder, Houdini, screenshot), submit, restart, hit ↑, observe the same chip layout, hit Enter, observe the agent receives the same prompt and same image bytes. Also confirm the missing-sidecar case (delete an image sidecar file manually, hit ↑, observe the chip is silently stripped from that entry only). Build before launching through `./scripts/dev` or `./scripts/dev pi`. Record user acceptance before archival; rolling back code restores prior expanded-text recall for entries written under this change.
