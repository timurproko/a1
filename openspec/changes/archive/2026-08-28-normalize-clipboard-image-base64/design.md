## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the behavioral contract.

The native `@mariozechner/clipboard` implementation encodes PNG bytes with Rust's `STANDARD_NO_PAD`. `readSystemClipboardContent()` currently copies that string into `PiShellClipboardContent`; `PromptChipStore` retains it unchanged; and `PiSessionCommandIntegration` passes it to Pi's `PromptOptions.images`. Pi AI then builds provider input as `data:${mimeType};base64,${data}`. Strict OpenAI-compatible validation rejects the resulting data URL whenever the byte length requires omitted padding.

The defect is payload-dependent: native images whose byte length is divisible by three work, while the other two remainder classes fail. Existing tests inject `Buffer.toString("base64")`, which is already padded, so they do not exercise native output. The owned-UI command validator bounds image strings but does not establish base64 validity or canonical form.

## Goals / Non-Goals

**Goals:**

- Establish one canonical representation before image data enters prompt-chip state.
- Cover native and injected clipboard adapters with the same strict rule.
- Preserve bytes and MIME type without provider-specific branching.
- Fail safely before agent-session dispatch when clipboard data is malformed.

**Non-Goals:**

- Change transcript image rendering, image resize/block settings, or terminal image protocols.
- Convert image formats, inspect image dimensions, or infer MIME types from bytes.
- Accept URL-safe base64, whitespace, percent encoding, remote URLs, or complete data URLs in the payload-only contract.
- Patch Pi AI's provider conversion or relax a provider validator.

## Decisions

### 1. Canonicalize at clipboard ingress, not in a provider adapter

Add a small shared prompt-image canonicalizer used before clipboard image content is handed to `PromptChipStore`. The normal form is RFC 4648 standard base64 using `A-Z`, `a-z`, `0-9`, `+`, `/`, with the exact required trailing `=` padding and no whitespace or wrapper.

The canonicalizer accepts either correctly padded input or omitted trailing padding. It first validates alphabet, padding position/count, and possible encoded length; then restores required padding, decodes, and re-encodes the bytes with Node's standard padded base64 encoder. Re-encoding both establishes a unique representation and verifies byte preservation. It must not rely on `Buffer.from(value, "base64")` alone because Node's decoder permissively ignores some malformed input.

The native path may prefer `getImageBinary()` and encode those bytes directly, avoiding the dependency's no-padding representation. The shared canonicalizer still remains authoritative for injected clipboard adapters and any string-based fallback.

Alternative considered: append `=` until the length is divisible by four. Rejected because it would make malformed alphabets and misplaced padding appear repaired.

Alternative considered: normalize in the OpenAI provider conversion. Rejected because the shell would retain invalid state, other strict providers could fail, and provider code is owned by Pi AI rather than A1.

### 2. Store only canonical image data in prompt chips

A successful image paste creates the same compact chip as today, but its retained attachment already contains canonical data. Submission therefore remains a simple expansion of chip state and every prompt, steering, or follow-up path receives the same representation without a second normalization policy.

Canonical padded input is idempotent. MIME type is carried through unchanged; MIME validation and image transcoding remain at their existing boundaries.

Alternative considered: preserve raw input in the chip and normalize only during submission. Rejected because malformed data would appear accepted until later and every submission path would need to enforce the rule independently.

### 3. Invalid image input falls back before editor mutation

The clipboard read/ingress path treats canonicalization failure like an unavailable image. If text is available, it returns that text to the existing URL/path/plain-text transformation. If text is unavailable, paste is a no-op. No malformed image chip is created and no malformed attachment reaches the owned command or Pi session.

The shared logic applies both to the system clipboard and to the session-shell clipboard port used by tests or other hosts. This keeps a custom adapter from bypassing the invariant.

Alternative considered: create an error chip and reject on submit. Rejected because it leaves the editor in a state that looks sendable and delays a recoverable clipboard fallback.

### 4. Regression evidence covers representation and dispatch

Focused canonicalizer tests cover both missing-padding classes, the divisible-by-three class, canonical padded input, and malformed alphabet/padding/length/wrapper cases. Session-shell coverage pastes an intentionally unpadded image, submits its chip, and asserts that `PromptOptions.images` contains the canonical padded value and unchanged MIME type. A malformed-image case proves text fallback or no editor mutation and no image dispatch.

The fixture must derive unpadded values explicitly rather than using only `Buffer.toString("base64")`, because that API produces the canonical form and previously masked the defect.

## Risks / Trade-offs

- **[Strict validation rejects a nonstandard adapter value that Node could decode permissively]** → Keep the payload contract explicit and use text fallback; accepting ambiguous forms would recreate provider-dependent behavior.
- **[Encoding binary clipboard output temporarily allocates both bytes and base64]** → Keep existing image-count/data-size limits and release the binary buffer after canonicalization; this is bounded and occurs once per paste.
- **[The native optional dependency is unavailable in some test environments]** → Test the canonicalizer and injected clipboard path deterministically; retain existing graceful native-adapter fallback.
- **[Future clipboard libraries may return a complete data URL]** → Reject wrappers intentionally and add a dedicated conversion contract later if such an API is adopted.

## Migration Plan

1. Add the strict canonicalizer and focused representation tests.
2. Route native and injected clipboard image ingress through it before chip creation, retaining text fallback.
3. Add the end-to-end chip-to-`PromptOptions.images` regression and malformed-input cases.
4. Roll back by reverting the ingress wiring and helper together; no persisted data or session schema migration is required because prompt chips are process-local.
