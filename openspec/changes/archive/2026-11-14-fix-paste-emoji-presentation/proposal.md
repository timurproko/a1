## Why

Text-default emoji characters render smaller than emoji-default characters in the terminal. The reported examples are framed picture U+1F5BC, right arrow U+27A1, and information U+2139. Fixing only the image-file icon would leave the same defect in other content-area prose.

## What Changes

- Introduce one Unicode-aware emoji-presentation policy, based on valid emoji-presentation sequences rather than a per-icon replacement list.
- Apply it to displayed content-area prose before width measurement and wrapping, preserving original message text and copy semantics.
- Use the same policy for generated image-file chip icons and recognize both new and legacy chip labels.
- Preserve explicitly requested text presentation, code, link destinations, paths, existing emoji sequences, and non-emoji symbols.

## Capabilities

### New Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: consistent emoji presentation in displayed prose and generated chips, without changing source meaning or breaking geometry.

## Impact

Owned presentation helpers, Pi Markdown adaptation, source-aware content copying where needed, path-chip generation, canonical chip recognition, and focused tests. No terminal font configuration, dependency upgrades, persisted-message migration, or changes to attachment semantics. Filename-preservation PR #930 remains separate and shared-contract changes must be reconciled.
