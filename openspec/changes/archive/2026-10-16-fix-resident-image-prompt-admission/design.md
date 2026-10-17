# Design

## Context

See `proposal.md` for motivation. Resident `SessionShell.#submit` currently passes the complete prepared image array to `ResidentTabRecovery.admit`. `PromptJournal.submit` serializes that array into one JSONL `submitted` record, while `MAX_RECORD_BYTES` is 2 MiB. The reported prompt created eight current-profile image sidecars totaling 4,551,022 bytes, so its otherwise valid recovery record could not pass the journal bound; the direct `a1 solo` route has no journal admission and therefore sent the same class of prompt.

Two adjacent lifecycle defects amplify the problem. The engine command promise normally completes after the run has returned to ready, but the submission is added to `ResidentTabRecovery.#active` only after that promise completes. The ready transition therefore sees no active submission. A later prompt retires the prior one, but the current entry remains pending, so compaction never observes an empty journal during uninterrupted use.

The existing recovery UI consumes only each pending record's text. Image payloads serialized into the journal are not used to rebuild image chips. Separately, enabled prompt history already writes image payloads to profile-local, owner-restricted sidecars before resident admission; its chip store can validate and rehydrate those sidecars or remove an unresolved image token.

## Goals / Non-Goals

**Goals:**

- Keep the durable-before-dispatch barrier for resident prompts while making its record size independent of model-bound image bytes.
- Preserve the exact validated image array on the actual engine command.
- Close the lifecycle race for normal prompts, steering, and follow-ups without retiring work that is still busy.
- Make recovered image-chip presentation correspond to attachments that are actually available.

**Non-Goals:**

- Introduce a second attachment store or make prompt-history sidecars part of the journal durability guarantee.
- Automatically replay an interrupted prompt or silently retry a failed journal admission.
- Change image count/size limits, prompt-history retention, resident native protocol, or direct/comparison modes.
- Repair or delete existing runtime journals; startup reconciliation already retires entries proven settled from session ancestry.

## Decisions

### 1. Journal recoverable text and identity, not duplicate image bytes

The resident admission contract will stop carrying `images`. `SubmittedPromptRecord` remains the stable identity, session/incarnation, file-existence, kind, text, and time needed by current reconciliation. The shell will continue constructing the engine command from the same prepared text and validated image array, but only bounded text and metadata cross the journal boundary.

This matches the implemented recovery consumer, restores the 2 MiB per-record guarantee, and avoids synchronously JSON-encoding and flushing several megabytes on the input path. It also reduces duplicated sensitive data. Raising the record and journal caps was rejected because a legal maximum prompt could approach 128 MiB of encoded images and would turn one input admission into a large synchronous durability operation. A new per-tab attachment store was rejected because the existing product does not promise journal-owned attachment durability, and adding atomic sidecar ownership, total quotas, orphan recovery, expiry, and migration would broaden this severe admission repair unnecessarily.

### 2. Preserve tags in bounded recovery text and validate them at restore

The journal retains the editor's canonical text, including image-chip tags, so enabled prompt history can restore available attachments in position. On startup, recovered prompt text will pass through the existing chip rehydration boundary with the selected profile's sidecar resolver before it is placed in the editor or editor history. A valid sidecar becomes a live image chip; a missing, malformed, disabled, or unavailable sidecar removes only that token.

Prompt history remains opportunistic and is not used to decide whether dispatch is allowed. The journal append remains the sole durability barrier. Persisting sidecar paths or bytes in the journal was rejected because it would couple recovery authority to asynchronous history retention and duplicate its profile mapping.

### 3. Reconcile settlement after correlation when the engine is already ready

The composition's resident `correlated` adapter will append correlation first, then inspect the current engine lifecycle. If the session is no longer busy, it immediately invokes the existing settled-turn path with the current session file. If the session is still busy, the existing busy-to-ready observer remains the owner of settlement.

Both routes consume `ResidentTabRecovery.#active` with `splice(0)`, and journal retirement is idempotent. Therefore a ready transition racing the post-correlation check can settle through either route without duplicate state. This is preferred over correlating before engine dispatch, which would misstate ordering, and over delaying command completion, which would couple UI responsiveness to another lifecycle wait.

### 4. Cover the full regression at the shell and storage boundaries

A session-shell regression will use an image payload aggregate above 2 MiB and assert that resident admission receives no attachment bytes while the engine receives every image unchanged. Recovery tests will cover sidecar hits and misses. Resident storage/composition tests will cover post-ready correlation, same-turn synchronization/retirement, compaction without a second prompt, and the busy steering path.

The tests will construct bounded synthetic base64 rather than read workstation screenshots or journal contents.

## Risks / Trade-offs

- **[A crash occurs after journal admission while history sidecar persistence was disabled or failed]** → Recovery preserves ordinary text but removes unavailable image tokens and never claims the screenshots remain attached; automatic replay remains forbidden.
- **[Ready transition and post-correlation reconciliation race]** → Active-entry consumption and retirement stay idempotent, and focused tests exercise both event orders.
- **[A large text-only prompt still exceeds 2 MiB]** → Existing bounded admission continues to reject it without dispatch; this change removes only unrelated attachment-byte inflation.
- **[Historical journals contain inline image arrays]** → The decoder continues accepting unknown `images` data on old submitted records long enough to reconcile them, while new records omit it; no destructive migration is required.

## Migration Plan

Ship the reader-compatible record narrowing and lifecycle reconciliation together. Existing journals remain readable and are retired through normal session reconciliation. Rollback restores inline image serialization and the original lifecycle lag but does not require a data migration because omitted optional image fields are already accepted by the prior decoder.
