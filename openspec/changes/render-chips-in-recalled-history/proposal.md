## Why

Persistent prompt history currently stores the expanded form of every submission and strips image chips entirely. Recalling an older prompt therefore shows raw file paths, raw URLs, inline text-paste bodies, and no trace of screenshots, instead of the compact chip layout the user originally authored. The user cannot recognize past prompts at a glance, cannot re-send a screenshot from history, and long text pastes visibly bloat the recalled draft. The v2 prototype demonstrated that a chip-preserving recall is the expected experience; bare A1 should match it without adopting v2's global paste cache, embedded chip identifiers, or process-scoped best-effort failure handling.

## What Changes

- Recall value keeps every chip tag verbatim as the user authored it, including `[paste #N …]`, `[🔗 …]`, `[📄 …]`, `[📁 …]`, `[🟧 …]`, and `[📷 screenshot-…]` (with any existing `-resized` suffix).
- The recall pipeline re-runs the existing semantic chip detection on the recalled text so text-paste, URL, file, folder, and Houdini tags become atomic chips again in the editor, using the same thresholds and identity rules that apply at paste time.
- Image chip payloads are written to a per-profile `<A1 dataDir>/history/<profile>-images/<id>.json` sidecar at submit time, keyed by the existing screenshot identifier already embedded in the tag; the SQLite prompts table stores only the chip-tagged text.
- Retention pruning of a history row cascades to delete the corresponding image sidecars; store-open runs one bounded sweep that removes sidecars whose identifiers no longer appear in any surviving row.
- Recall rehydrates an image chip from its sidecar into a live image chip carrying real bytes; a missing, unreadable, or truncated sidecar silently strips its chip from the recalled text without any notice, warning, or degraded placeholder.
- Text/URL/file/folder/Houdini chip resolution at submit time is unchanged from today; image chip resolution reads first from the in-memory chip store and then from the profile sidecar directory.
- Chip archive lifecycle follows the persistent-history opt-out: when history retention is zero or persistence is unavailable, no sidecar is written and no sidecar is read.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `persistent-prompt-history`: Preserve authored chip tags verbatim in recall values; rehydrate every known chip pattern on recall through the existing semantic chip owner; persist image chip payloads to per-profile sidecars whose lifecycle is bounded by history retention; silently strip an image chip when its sidecar is missing or unreadable.

## Impact

Expected specification impact is one delta to `openspec/specs/persistent-prompt-history/spec.md`.

Expected implementation areas (for the follow-up implementation change, not this planning PR) are `src/integrations/pi/session-ui/prompt-chips.ts`, `src/integrations/pi/session-ui/prompt-history-controller.ts`, `src/integrations/pi/session-ui/session-shell.ts`, `src/features/prompt-history/store.ts`, `src/features/prompt-history/service.ts`, `src/features/prompt-history/paths.ts`, `src/contracts/owned-ui/prompt-history.ts`, and focused component/session tests. No new dependency, no new contract capability, no SQLite schema migration, and no change to native `a1 pi` are intended. Existing `persistent-prompt-history` byte budgets, retention count, lifecycle failure semantics, and profile-isolation policy remain in force; the new sidecar directory inherits the same permissions posture and opt-out coupling. This change contains planning artifacts only.
