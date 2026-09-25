## Why

A provider outage across six concurrent sessions produced 184 request failures: Pi recovered 171 automatically, but 13 runs stopped after the default three retries with only `Error: fetch failed`, leaving the retry budget, attempt count, and safe continuation path unclear. A1 should let users choose a larger but finite agent-level budget and make exhaustion recoverable without introducing infinite or nested provider retries.

## What Changes

- Expose Pi's agent-level automatic-retry switch and retry limit in bare A1's existing Agent settings section as live settings, preserving the current default of three retries and allowing a finite limit from one through ten.
- Keep Pi's existing exponential backoff and 60-second agent-delay cap; do not expose or enable provider-level retries, whose default remains zero.
- Show the current retry number and configured limit while retrying, and replace a terminal retryable error with an attempt-aware failure that distinguishes total requests from automatic retries while retaining the provider error.
- Offer a declared `Ctrl+R` action after retry exhaustion that explicitly continues the failed turn from its retained context with one more configured automatic-retry budget, preserves the editor draft and image context, and does not duplicate the user message or rerun completed tools solely because of the action. Each invocation is finite; A1 never chains exhausted budgets without another user action.
- Require an immutable published Pi package that exposes validated public persistence/application APIs, retry-continuation behavior, and presentation metadata for both retry settings before dependency adoption. Do not patch dependencies, import private Pi modules, or write Pi settings storage directly.

## Capabilities

### New Capabilities

- `provider-retry-control`: Bounded provider retry visibility, attempt-aware exhaustion reporting, and explicit user-controlled continuation after exhaustion.

### Modified Capabilities

- `owned-ui-settings`: Present the two writable retry controls once in the existing Agent section with truthful live state and generated engine wording.
- `pi-settings-runtime`: Persist and apply the agent-level retry switch and finite retry limit through Pi's public settings owner while keeping provider-level retries disabled by default.

## Impact

- A future qualifying Pi package and A1's exact Pi dependency family, generated settings metadata, settings bridge/effect inventory, and active session owner binding.
- Pi session-event projection, bare-A1 working/failure presentation, editor shortcut declarations, and failed-turn continuation routing.
- Focused settings, retry lifecycle, shortcut, image-prompt, provider-failure, visual, and dependency-compatibility evidence.
- `a1 pi` retains pinned Pi presentation and behavior; existing profile settings remain authoritative and are not migrated into A1-owned settings.
