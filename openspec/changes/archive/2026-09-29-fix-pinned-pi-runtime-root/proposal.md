## Why

A running A1 session can lose or replace `PI_PACKAGE_DIR` after startup, causing the lazy Pi image modules activated by an attached screenshot to fail even though launch already validated the pinned package. Attachment submission must not depend on mutable process environment state after startup.

## What Changes

- Retain the validated pinned Pi public-package root as process-lifetime runtime state when the generated startup facade configures it.
- Resolve later lazy Pi module URLs and documented dependency exports from that retained root rather than rereading `PI_PACKAGE_DIR`.
- Keep `PI_PACKAGE_DIR` populated for upstream Pi compatibility while making external deletion or replacement of that environment value harmless to the running A1 session.
- Add focused regression coverage for attachment-image module resolution after environment mutation and for invalid or unavailable package identities.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: Require the generated public Pi startup boundary to retain its validated package identity for the lifetime of the running process so lazy public-module resolution cannot drift with mutable environment state.

## Impact

The shipped helper in `bin/pinned-pi-public.js`, its focused repository-governance tests, and the generated startup artifact contract are affected. No dependency version, public command, profile location, or user configuration changes.
