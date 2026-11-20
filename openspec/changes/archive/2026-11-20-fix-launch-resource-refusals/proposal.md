# Proposal

## Why

A1 currently treats errors in automatically discovered project extensions as fatal whenever launch options are present, so an otherwise valid worker launch dies while a bare launch succeeds. The failure is also routed through crash reporting, hiding the resource and reason behind a diagnostic-file pointer.

## What Changes

- Limit fatal invocation resource validation to explicitly requested extension resources and extension flags; leave unnamed project failures on the ordinary diagnostic path.
- Preserve strict refusal of failed explicit imports, missing paths, provider registrations belonging to explicit extensions, and unusable extension flags.
- Print expected launch refusals with the resource or option and its reason, while retaining private diagnostic handling for unexpected crashes.
- Cover the behavior with disposable source-runtime fixtures and real development-entry terminal checks for ordinary A1 and its Pi-compatible adapter.

## Capabilities

### New Capabilities

- `launch-resource-validation`: Classifies invocation resource failures and reports expected launch refusals without making unrelated project discoveries fatal.

### Modified Capabilities

None. The existing `cli-unsupported-input` capability concerns unsupported syntax, not failure to load a supported, explicitly requested resource.

## Impact

- Pi invocation validation in `src/integrations/pi/engine/launch-options.ts`, its session-factory and catalog callers, and the error boundary in `bin/ui.js`.
- Targeted embedded-runtime and development-launch tests and `docs/features/pi-compatible-launch.md`.
- No Pi dependency upgrade, installed-release mutation, trust-policy change, or edits to Firstmate. The observed Firstmate parse failure is separate from A1's incorrect refusal policy.
