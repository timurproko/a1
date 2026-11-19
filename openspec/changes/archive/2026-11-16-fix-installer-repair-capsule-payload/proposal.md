## Why

Development publication 43835245506 failed on Windows, Linux, and macOS because the exact installer tarball omitted repair-capsule.js, which its executable imports unconditionally. The package validator also expects help text predating the existing repair option.

## What Changes

- Include the existing dependency-free repair helper in the installer manifest, staging copy, and exact payload allowlist.
- Align packaged-launcher help validation with the existing repair command contract without changing installer behavior.
- Add isolated packed-artifact regression coverage for successful offline installation, executable help, removed-option rejection, and missing-helper failure.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `silent-installer`: require a self-contained exact installer artifact and validation through its installed public launcher.

## Impact

Only installer packaging, package validation, focused tests, and delivery artifacts change. Publication gates, runtime dependencies, repair authorization, and application behavior remain unchanged.
