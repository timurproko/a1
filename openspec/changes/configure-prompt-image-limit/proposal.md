## Why

Bare A1 fixes every prompt at eight image attachments even when a user intentionally needs a larger screenshot set, and overflow feedback remains in the prompt-adjacent notice dock after the offending image chip is removed. The limit should be a bounded profile preference, its rejected overflow chip should remain recognizable but appear inactive rather than failed, and its correction feedback should retire as soon as the current draft no longer contains the count rejection.

## What Changes

- Add a profile-local live `promptImageLimit` setting under the existing Agent section, labeled `Prompt image limit`, with every integer from 1 through 16 available and 8 retained as the default.
- Apply the effective setting consistently to image paste admission and final ordinary, steering, follow-up, and compaction-queued submission validation while retaining 16 as the absolute owned-command safety ceiling.
- Report the effective numeric limit in an attachment-count warning and preserve the rejected overflow attachment's normal screenshot label while dimming it rather than presenting it as failed.
- Clear only the active attachment-count warning when the user removes the rejected overflow marker or enough image references for the current draft to satisfy the effective limit; preserve unrelated warnings and errors.
- Show the ordinary live spinner as `Sending…` until the engine accepts an image-bearing prompt, then restore normal engine-owned `Working…` or extension status while processing continues.
- Keep per-image byte, source-image, pixel, preparation-worker, provider, and `a1 pi` comparison behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Declare the profile-local live prompt-image limit and its placement in the existing Agent section.
- `owned-pi-ui-foundation`: Replace the fixed eight-attachment editor policy with a bounded live limit and retire corrected count feedback without weakening the absolute command boundary.

## Impact

Implementation will affect owned settings declarations and migration, bare-A1 composition, prompt-chip admission and submission validation, typed image-count diagnostics, prompt-adjacent notice ownership, and focused settings/chip/session-shell coverage. No Pi settings document, provider payload shape, image byte cap, source preparation policy, or installed Pi code will change.
