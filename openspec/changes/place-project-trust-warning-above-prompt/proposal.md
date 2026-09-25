# Place project-trust warnings above the prompt

## Why

Cancelling the startup trust selector correctly starts A1 with project resources withheld, but its warning currently renders at the top of the transcript viewport. In a fresh session that leaves a large empty gap between the explanation and the prompt, making the restricted launch look broken.

## What Changes

- Classify trust-preflight warnings separately from ordinary engine startup diagnostics.
- Present the warning through bare A1's existing transient notice dock immediately above the prompt.
- Keep the warning outside transcript, selection, copy, navigation, and persistence semantics.
- Preserve the pinned startup-diagnostic placement in the `a1 pi` comparison profile.

## Impact

- Affected specs: `pi-settings-runtime`, `owned-pi-ui-foundation`.
- Affected code: runtime diagnostic classification and session-shell startup presentation.
- Project trust policy and resource isolation remain unchanged.
