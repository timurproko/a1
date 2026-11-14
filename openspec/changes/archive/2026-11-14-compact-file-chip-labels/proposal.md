# Compact attachment chip labels

## Why

Pasted attachment chips expose path or identity suffixes that are useful internally but noisy in the UI. The requested presentation is the attachment icon immediately followed by its filename, without a space or visible identity suffix.

## What Changes

- Present file, folder, and filename-bearing image chips as an icon immediately followed by the basename, without identity/hash/path suffixes.
- Keep backing paths, attachment identifiers, collision distinctions, history persistence, and submission values unchanged.
- Apply the display policy consistently to the live owned editor, queued prompts, and submitted prompts, including supported legacy labels.
- Preserve atomic editing, selection/copy semantics, width-bounded wrapping, and the pinned Pi comparison route.

## Impact

- Affected capability: custom-session-viewport.
- Affected owners: owned-ui contracts, session shell chip metadata, and Pi component presentation adapters.
- No change to attachment acquisition or model-facing content.
