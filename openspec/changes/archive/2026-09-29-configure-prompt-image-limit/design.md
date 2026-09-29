## Context

See `proposal.md` for motivation. Image attachment count currently has one hard-coded value in two layers: `PromptChipStore` refuses a ninth current-draft image during synchronous or isolated paste preparation, and the owned command contract refuses more than eight final attachments. `ImageAttachmentError("image-count")` supplies a static eight-image message. Bare A1 projects these failures into one prompt-adjacent dock notice, which intentionally survives editor activity until another prompt or command retires it; consequently deleting the overflow chip does not retire the now-stale count message.

Owned settings already support profile-local live values and merge A1-owned controls into the existing Agent section after engine descriptors. `promptSuggestions` and `skillsPresentation` are the composition precedents. The comparison profile receives no owned settings manager and must retain its current eight-image behavior.

## Goals / Non-Goals

**Goals:**
- Let bare-A1 users select a prompt image limit from 1 through 16, defaulting to 8.
- Apply the selected value live and consistently at paste admission and every shell submission path.
- Keep an absolute finite command boundary even when the interactive preference is increased.
- Remove a stale attachment-count notice when editing actually resolves that count failure.
- Preserve error ownership so correction never clears an unrelated notice.

**Non-Goals:**
- Remove attachment-count safety bounds or infer provider-specific image limits.
- Change per-image encoded byte limits, source-image limits, resize quality, worker concurrency, or terminal image rendering.
- Automatically retry a rejected paste, revive a failed image chip, or silently discard attachments.
- Add this A1 preference to Pi settings or change the `a1 pi` settings screen.

## Decisions

### 1. Declare a live A1-owned Agent setting

Add `promptImageLimit` after `skillsPresentation` in the owned declaration table, with label `Prompt image limit`, section `Agent`, allowed integer values 1 through 16, default 8, and live application. Advance the owned settings document version with a no-op forward migration so older profiles resolve to 8 while preserving every existing and unknown value.

The value remains A1-owned because it governs A1's prompt-chip admission boundary, not a pinned Pi runtime setting. The existing section merger will place it after engine entries, `Prompt suggestions`, and `Skills` without creating another Agent section; it remains available if engine settings cannot be presented.

An unbounded numeric input was rejected because the command contract still needs a finite resource ceiling. A next-start boundary was rejected because admission can read the setting for each paste and submission without reconstructing the session.

### 2. Separate the configurable editor policy from the absolute command ceiling

Retain two explicit values: 8 as the user-facing default and 16 as the absolute maximum accepted by the owned command contract. Bare-A1 composition will provide the shell a live limit reader backed by `OwnedSettingsManager`; settings-free and comparison compositions will use the default 8. Prompt-chip admission and final shell preparation will compare the current draft's unique attachments against the effective reader value. The neutral owned-command assertion will accept no more than the absolute maximum, preventing another input path from constructing an unbounded command.

The setting therefore controls interactive prompt policy while the contract remains the final safety boundary. Raising the setting does not claim that every provider accepts that many images; existing downstream errors remain authoritative. Lowering the setting does not delete existing draft chips: the next paste or submission reports the new limit and lets the user choose what to remove.

### 3. Use one parameterized count assertion across admission and submission

Replace literal count checks with one bounded helper that accepts the effective limit, validates it against the absolute ceiling, and emits a typed `image-count` rejection whose message names that limit. Present that rejection in bare A1 as a corrective warning—`A prompt is limited to <limit> image(s). Remove an attachment or change the limit in /settings.`—rather than as an error, while retaining the typed failure for admission control and notice ownership. Use it for synchronous paste transformation, asynchronous image identification before preparation work starts, ordinary prompt submission, steering, follow-up, compaction-queued submission, and restored/deferred shell drafts. Keep unique attachment semantics: repeated references to one live image chip remain one attachment, pending and non-count failed image chips continue occupying draft slots, and count-rejected markers remain visible without consuming another sendable slot.

Changing only the paste checks was rejected because final command validation would still reject a configured value above eight. Raising only the command constant was rejected because the settings value would not govern early work admission or provide consistent diagnostics.

### 4. Track attachment-count feedback as an owned, correctable notice

Associate the prompt-adjacent warning produced by `image-count` with that typed failure rather than relying on message text. On editor changes and live limit changes, inspect the current draft through the prompt-chip store. Clear that notice only when the draft is within the effective limit and no referenced count-rejected marker remains. Removing the rejected overflow marker from an otherwise full valid draft therefore clears the notice immediately; removing ready images from a draft that became over-limit after lowering the setting also clears it when compliant.

Do not clear a newer status, warning, or error that replaced the count notice, and do not clear size, codec, pending, or delivery-uncertain failures merely because image count changed. Give an attachment rejected specifically for `image-count` its own atomic `not sent` marker and dim that marker in the editor; other preparation failures retain their failed marker. Count-rejected markers do not consume another sendable slot, remain unsendable, and are never promoted or retried when the limit increases. Submission omits those explicitly marked attachments and proceeds with the remaining text and ready images, while history and submitted-prompt presentation also omit the rejected markers.

A dimmed generic `failed` marker was rejected because it still frames expected policy enforcement as a preparation failure. Rejecting the entire prompt while a clearly marked `not sent` chip remains was rejected because the explicit inactive treatment gives the user enough information to proceed with the accepted subset.

Clearing every dock notice on any editor edit was rejected because command and submission diagnostics intentionally survive unrelated typing. Matching display strings was rejected because wrapped/localized wording is presentation, not identity.

### 5. Show truthful image-submission activity

While an image-bearing prompt command is awaiting engine dispatch settlement, temporarily override the ordinary live working label with `Sending…` and retain the existing spinner. Clear only that shell-owned override in a `finally` path so success, rejection, and failure all restore the current extension/engine status. Do not display synthetic per-image progress: the engine submits all accepted attachments in one request and exposes no truthful per-image upload callback.

A fabricated `Sending (1/8)` counter was rejected because it would imply transport progress the provider API does not report.

### 6. Verify settings, count boundaries, and correction lifecycle independently

Settings tests will cover default resolution, version migration, Agent-section order, persistence, and live change delivery. Prompt-chip/contract tests will cover configured values below, at, and above 8; the absolute 16/17 boundary; pending, failed, duplicate, restored, and sequential image cases; and dynamic error wording. Session-shell tests will exercise ordinary and queued paths, sendable subsets with omitted count-rejected markers, the image-submission spinner, and a real draft edit that removes overflow and clears only the matching dock notice. Comparison coverage will confirm `a1 pi` remains fixed at eight and receives no owned setting.

## Risks / Trade-offs

- **[Sixteen large final attachments can increase request memory substantially]** → Keep the existing 8 MiB per-attachment cap, retain 16 as a hard ceiling, reject before dispatch, and make no provider-acceptance claim.
- **[Live setting and asynchronous paste completion can race]** → Resolve the limit at the admission/validation point, not when paste intent is first created; the current effective value owns that decision.
- **[A stale count warning could clear a newer notice]** → Carry typed notice identity and clear only the still-current `image-count` notice.
- **[An unsent overflow marker looks count-compliant after another image is deleted]** → Treat referenced count-rejected markers as unresolved until removed; never silently convert them into ready attachments.
- **[Concurrent extension status could be lost after image dispatch]** → Give shell-owned sending state precedence only while active, then recompute the extension override instead of clearing the shared status directly.
- **[Comparison behavior could drift]** → Supply the setting port only in bare A1 and assert the settings-free fallback remains eight.

## Migration Plan

1. Add the versioned owned setting and compose its live reader only into bare A1.
2. Introduce the explicit default/configurable/absolute count boundaries and route all shell admission and submission paths through them.
3. Add typed count-notice reconciliation on editor and setting changes.
4. Verify focused settings, prompt-chip, command-contract, shell, queued-input, and comparison behavior before interactive review.

Rollback removes the declaration and live reader and restores the fixed count policy. The existing migration and unknown-key preservation allow a newer stored `promptImageLimit` key to remain inert without damaging older settings.
