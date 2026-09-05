## Why

Implementation of `fix-cli-session-resume` exposed a separate upstream compatibility defect: Pi 0.84.2 documents `retainedTail` compaction checkpoints but silently omits their messages when rebuilding context. The resume repair cannot meet its accepted history-restoration requirement by merely reconnecting the launcher, and the newer published Pi packages inspected so far do not fix that defect.

## What Changes

- Define retained-tail restoration as a required session capability, including ordered message preservation, empty-tail semantics, active-branch isolation, legacy `firstKeptEntryId` compatibility, and non-destructive reopening.
- Require a corrected upstream implementation exposed through public Pi APIs and verified from an immutable published package before selecting an exact compatible Pi dependency family for A1.
- Add an independent behavioral compatibility gate that catches disagreement between documentation, declarations, and shipped runtime behavior; version numbers and exported function names alone do not prove support.
- Adapt only the A1 integration needed to consume the corrected public behavior, and ensure the agent context and owned transcript agree. Reject malformed or unsupported retained checkpoints rather than silently drop messages, reconstruct from guesses, or submit a prompt with incomplete context.
- Certify the candidate against existing API, extension, settings, TUI/module identity, packaging, and session lifecycle contracts without automatically synchronizing unrelated upstream UI changes.
- Record this as a prerequisite of the already accepted `fix-cli-session-resume` implementation. That stream continues to own CLI parsing/forwarding and exit-hint round trips; this stream owns dependency compatibility only.

No production dependency patching, prototype mutation, private Pi imports, A1-owned compaction engine, in-place session conversion, or unverified upgrade is authorized.

## Capabilities

### New Capabilities

- `pi-session-compatibility`: Faithful restoration of retained-tail and legacy compaction checkpoints, consistent context/presentation, and safe failure behavior.

### Modified Capabilities

- `pi-api-boundary`: Require executable session-format compatibility evidence from the exact published candidate and an explicit blocked outcome when no compatible upstream artifact exists.

## Impact

- Future upstream correction and publication are external prerequisites; this A1 proposal does not claim they already exist or authorize modifying the upstream repository in this PR.
- Subsequent A1 implementation may update the exact Pi family in `package.json`/lockfile and narrowly migrate public integration types, compatibility fixtures, and evidence metadata after the candidate passes its gates.
- Session integration and conformance tests gain compacted-session fixtures and lifecycle coverage. Existing storage/profile identity and accepted presentation remain unchanged except for correctly restoring previously omitted messages.
- This PR contains OpenSpec planning artifacts only and leaves the paused CLI implementation untouched.

## Current Availability

On 2026-09-05, a direct reproduction against Pi 0.84.2 returned only the compaction summary for a checkpoint containing a retained user message. Published `dist/core/session-manager.js` from 0.84.3, 0.84.4, and 0.85.0 still lacks retained-tail handling; inspected upstream main source does too. No passing candidate is selected. Planning can complete, but dependency adoption and the blocked CLI restoration task must wait for a corrected published candidate and its certification.
