## Context

See `proposal.md` for motivation. At planning base `b8672719`, `PromptChipStore` assigns each clipboard image a generated `[📷 screenshot-<id>]` token. The token is both an atomic editor range and the key used to resolve attachment bytes, wait for preparation, enforce image limits, persist history sidecars, and rebuild recalled drafts. Unknown text pastes already use editor hidden ranges, proving that bare A1 can retain a semantic reservation without painting its token; ready images currently stop participating in those hidden ranges.

On submission, the shell sends the generated token as ordinary prompt text together with the image attachment. Pi may normalize the image for the selected model and append a canonical dimension note such as `[Image: original …, displayed at ….]` to the stored user-message text. The transcript projection currently renders all user text verbatim. Bare A1 separately owns a transient dock notice for informational workflow messages, while `a1 pi` intentionally keeps pinned transcript placement.

## Goals / Non-Goals

**Goals:**
- Make generated image identities presentation-private while retaining one authoritative token for preparation, editing, history, and attachment resolution.
- Separate recognized successful image-processing metadata from the visible submitted request and surface it through the existing bare-A1 dock notice.
- Preserve literal user-authored image-looking text, image previews/fallbacks, and all attachment semantics across ordinary, steering, follow-up, queued, and recalled submissions.

**Non-Goals:**
- Do not remove image identifiers from persisted/model context, change Pi's image-normalization guidance to the model, or rewrite historical session files.
- Do not hide failed-image chips or image validation errors, redesign the dock notice, add image thumbnails to the editor, or alter `a1 pi`.
- Do not infer arbitrary bracketed user text as image metadata; only provenance-bound generated markers and recognized successful processing notes qualify.

## Decisions

### 1. Hide generated image tokens at presentation boundaries, not by deleting semantic text

Ready image tags will join pending non-text image reservations in the editor's hidden-range presentation. The underlying token remains an atomic range at its exact insertion position, so caret mapping, Backspace/Delete, selection replacement, undo/redo, asynchronous completion, image order, copy/history preparation, and sidecar lookup keep one existing source of truth. Failed-image tags remain visible because they identify a recoverable attachment error.

Submitted user-message presentation will omit generated screenshot tags only when they are associated with image attachments owned by that message. Literal `[📷 …]` text without matching generated attachment provenance remains visible. An image-only submission still renders its image presentation and prompt identity/timestamp without an empty text bubble or leaked token.

Alternative rejected: remove tags from the editor or prepared text. That would require a parallel positional attachment model and would risk image-only submission, out-of-order preparation, durable recall, and editing regressions. Alternative rejected: hide every image-looking regular expression match. That would erase authored text and stale identifiers that are not live attachments.

### 2. Keep model guidance intact while deriving a display-only user-message view

Pi's successful conversion/dimension notes remain in the stored user message and provider context because coordinate mapping can be useful to the model. The transcript projection will derive visible user text and recognized image-note metadata from the same immutable message content without mutating the message. Recognition is limited to the canonical successful image-processing note forms and requires image attachment provenance; omission/failure text is not downgraded to an informational notice.

The derived metadata will travel as bounded presentation metadata on the user transcript block. This keeps parsing at the engine boundary, lets transcript components remain renderers, and avoids coupling the shell to Pi session objects or installed private fields.

Alternative rejected: intercept or patch Pi's image normalizer. It would change model context, require an installed dependency patch or unsupported private hook, and make behavior model-version dependent. Alternative rejected: strip bracketed text in the renderer alone. The shell would have no trustworthy metadata to place in the notice and could hide authored text.

### 3. Publish attachment information through the existing dock-notice lifecycle

When a live bare-A1 image paste becomes a ready attachment, the shell will publish a concise attachment notice above the editor, coalescing the current count rather than exposing identifiers. When the corresponding submitted user message introduces recognized successful processing notes, those notes replace the attachment notice in the same dock slot after the user block retires any older unrelated notice. Normal notice wrapping, working-status ordering, replacement, selection exclusion, and next-prompt/session-reset dismissal remain authoritative.

Restored transcript reconstruction will not recreate old dock notices. Only incremental live user-message delivery may publish processing metadata, so resuming a session remains free of stale prompt-adjacent status. Multiple notes from one submitted message form one bounded multiline notice in attachment order.

Alternative rejected: append a second transcript block. That would remain selectable, navigable, persistent-looking content and would not meet the requested prompt-adjacent placement. Alternative rejected: use a new widget. It would duplicate notice lifecycle, ordering, and cleanup rules.

### 4. Preserve pinned comparison and non-image chip behavior

The new hidden ready-image ranges and dock routing are enabled only by the custom-viewport/bare-A1 composition. The pinned route continues to show Pi-compatible chip and note placement. URL, path, large-text, and failed-image chips retain their existing presentation and expansion rules.

Alternative rejected: change the shared pinned editor or upstream component adaptation. That would invalidate the explicit comparison control and broaden the change beyond the reported surface.

## Risks / Trade-offs

- [An invisible token can be hard to discover or remove] → Show a concise attachment-count notice while editing and retain atomic deletion/undo behavior at the token position; verify surrounding-text and image-only cases physically.
- [A note-shaped authored line could be mistaken for generated metadata] → Require image-bearing message provenance and exact canonical successful-note parsing at the projection boundary; retain nonmatching and failure text verbatim.
- [Projection updates could publish a notice more than once] → Key publication to first incremental mount/revision semantics and coalesce through the single dock slot; restored full-view synchronization never publishes.
- [Empty visible text can create blank prompt chrome] → Give image-bearing user blocks an explicit attachment-only presentation path that retains timestamp/navigation identity and the actual image component without an empty text row.
- [Hiding tags only visually leaves them in copied/session/model text] → This is intentional compatibility: semantic and model behavior stay unchanged. The contract changes presentation, not stored context or attachment identity.

## Migration Plan

1. Add provenance-aware display projection for image tags and successful processing notes, then route live note metadata through the existing bare-A1 notice lifecycle.
2. Extend bare-A1 editor presentation to hide ready generated image tags and add attachment-count feedback while retaining current semantic operations.
3. Validate ordinary, streaming, queued, recalled, image-only, multiple-image, literal-text, failure, and pinned-comparison paths with focused deterministic tests and exact-head CI.
4. Build and launch through `./scripts/dev` for physical review of paste, edit, submit, notice placement, image preview, and history recall. No data migration is required. Rollback restores visible markers/inline notes without rewriting stored sessions or history sidecars.
