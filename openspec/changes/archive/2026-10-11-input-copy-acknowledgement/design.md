## Context

The ordinary bare-A1 prompt owns keyboard selection through `PromptSelectionInterceptor`. Both `Ctrl+C` and cut currently pass exact expanded editor text through one `onCopyText` callback. `OwnedUiSessionShell` submits that text through `ResponseCopyCoordinator`, but discards the completion result. Frame-selection copies use the same coordinator and show `OwnedUiSessionShellRoot`'s one-second prompt-adjacent acknowledgement only after successful completion.

## Goals / Non-Goals

**Goals:**
- Give successful `Ctrl+C` copies from a keyboard-selected prompt range the same acknowledgement as successful frame copies.
- Use the exact clipboard payload length and existing delivery outcome semantics.
- Keep stale asynchronous completions from showing obsolete feedback.
- Distinguish copy from cut without changing either payload.

**Non-Goals:**
- Changing selection, cut, paste, `/copy`, clipboard transport, timeout, or failure wording.
- Showing success before delivery submission completes.
- Changing `a1 pi` or installed Pi package behavior.

## Decisions

### 1. Carry the prompt operation across the editor callback

Extend the owned editor copy callback with a `cut` discriminator. `PromptSelectionInterceptor` supplies false for copy and true for cut at the point where the matched keybinding is known. Existing callback consumers may ignore the additional argument; the bare-A1 shell uses it only to decide whether successful delivery should produce an acknowledgement.

Alternative considered: acknowledge every `onCopyText` call. Rejected because that would silently add feedback to cut and would not satisfy the requested `Ctrl+C`-specific behavior precisely.

### 2. Acknowledge the exact delivered editor payload

The shell retains only the payload length and operation around `ResponseCopyCoordinator.submitText(text)`. A delivered or submitted-unverified `copy` completion shows `copied N chars to clipboard` through the existing root presenter. Failed, timed-out, canceled, or superseded work shows no success acknowledgement; the coordinator's existing failure route remains authoritative.

Alternative considered: show feedback synchronously when `Ctrl+C` is pressed. Rejected because transport failure would then be represented as success.

### 3. Share newest-intent fencing with frame copies

Every prompt copy/cut submission advances the shell's existing copy-intent sequence. A prompt-copy success may render only while its token is still newest. Frame and prompt copies therefore cannot overwrite each other's newer feedback when completion order differs; a cut can also invalidate an older pending copy acknowledgement without showing one of its own.

### 4. Preserve profile and route isolation

Only the custom bare-A1 viewport constructs `ResponseCopyCoordinator` and the owned prompt-selection interceptor. Comparison profiles retain their compatibility clipboard path and receive no new shell acknowledgement. `/copy` remains a separate semantic workflow.

## Risks / Trade-offs

- **[Callback contract broadens]** → Use a small operation union and focused interceptor tests for copy versus cut.
- **[Delayed success becomes stale]** → Reuse the monotonic shell copy-intent token across prompt and frame routes.
- **[Expanded chips differ from visible source text]** → Count the exact expanded text passed to `submitText`, which is the actual clipboard payload.
- **[Failure could show both success and error]** → Gate success strictly to delivered or submitted-unverified outcomes; retain coordinator failure handling.

## Migration Plan

No migration is required. Add failing focused tests, carry the operation discriminator, attach acknowledgement handling to prompt-copy completion, and run the affected selection/editor suites plus repository checks. Rollback removes the discriminator use and completion callback without changing clipboard data or persisted state.

## Implementation Evidence

See `implementation-evidence.md`. Automated evidence covers successful prompt-copy wording/count and placement, copy-versus-cut isolation, failed/stale completion suppression, exact clipboard payload preservation, comparison-profile isolation, strict OpenSpec validation, typecheck, build, architecture, and changed-documentation checks.
