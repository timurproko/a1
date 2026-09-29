## 1. Declare and compose the setting

- [x] 1.1 Add the live profile-local `promptImageLimit` declaration under Agent with values 1 through 16, default 8, and advance the owned settings migration without changing existing values.
- [x] 1.2 Supply the effective limit to bare-A1 prompt input through a live settings boundary while keeping settings-free and `a1 pi` compositions at eight.
- [x] 1.3 Cover resolution, persistence, migration, Agent-section ordering, live updates, and comparison isolation.

## 2. Apply one bounded image-count policy

- [x] 2.1 Separate the default prompt limit from the absolute 16-attachment command ceiling and parameterize count diagnostics with the effective limit.
- [x] 2.2 Enforce the current effective value for synchronous and asynchronous paste admission and for ordinary, steering, follow-up, restored, and compaction-queued submission preparation.
- [x] 2.3 Preserve pending/failed-slot accounting, duplicate-chip attachment semantics, per-image/source/preparation bounds, and fail-closed absolute command validation.

## 3. Retire corrected count feedback

- [x] 3.1 Track typed attachment-count notice ownership and reconcile it after draft edits and live limit changes.
- [x] 3.2 Clear only the still-current count notice once the draft is compliant and contains no referenced count-rejected marker; preserve unrelated notices and never retry rejected images.
- [x] 3.3 Add focused component and session-shell regressions for overflow, removal, replacement notices, limit changes, and queued submission paths; record evidence and any known gap without weakening assertions.
- [x] 3.4 Present count rejection as a corrective warning with `/settings` guidance and no error or recovery label.
- [x] 3.5 Render count-rejected overflow attachments as dimmed `not sent` chips and allow submission/history to omit them while preserving every accepted attachment.
- [x] 3.6 Show `Sending…` in the live spinner while image-bearing prompt dispatch is unsettled, then restore the applicable working status on every settlement path.
