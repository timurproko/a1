## Why

Bare A1 fixes every prompt at eight image attachments even when a user intentionally needs a larger screenshot set, and the overflow error remains in the prompt-adjacent notice dock after the offending image chip is removed. The limit should be a bounded profile preference, and its correction feedback should retire as soon as the current draft no longer contains the count failure.

## What Changes

- Add a profile-local live `promptImageLimit` setting under the existing Agent section, labeled `Prompt image limit`, with every integer from 1 through 16 available and 8 retained as the default.
- Apply the effective setting consistently to image paste admission and final ordinary, steering, follow-up, and compaction-queued submission validation while retaining 16 as the absolute owned-command safety ceiling.
- Report the effective numeric limit in attachment-count errors.
- Clear only the active attachment-count error when the user removes the rejected overflow marker or enough image references for the current draft to satisfy the effective limit; preserve unrelated warnings and errors.
- Keep per-image byte, source-image, pixel, preparation-worker, history, provider, and `a1 pi` comparison behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Declare the profile-local live prompt-image limit and its placement in the existing Agent section.
- `owned-pi-ui-foundation`: Replace the fixed eight-attachment editor policy with a bounded live limit and retire corrected count feedback without weakening the absolute command boundary.

## Impact

Implementation will affect owned settings declarations and migration, bare-A1 composition, prompt-chip admission and submission validation, typed image-count diagnostics, prompt-adjacent notice ownership, and focused settings/chip/session-shell coverage. No Pi settings document, provider payload shape, image byte cap, source preparation policy, or installed Pi code will change.

This change contains planning artifacts only, not implementation.
