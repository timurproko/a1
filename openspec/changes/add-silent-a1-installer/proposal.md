## Why

A first installation currently exposes npm's complete transcript, including transitive deprecation warnings, funding text, lifecycle-script policy warnings, package counts, and npm upgrade notices. A package postinstall hook cannot prevent that output because npm owns the terminal before A1 exists, and running the full A1 package through `npx` would leave the user waiting through the large bootstrap download before A1 could draw progress.

## What Changes

- Publish a small dependency-free `@timurproko/a1-installer` bootstrap whose only executable is `a1-installer` and document quiet `npx` forms for stable, development-channel, and exact-version installation.
- Make the installer resolve one exact A1 target from `latest`, `next`, or an explicitly supplied version, capture every child process stream, and render only the same blue/teal-and-grey single-row progress presentation used by self-update while successful work is running.
- Print exactly `a1 successfully installed` in the same unstyled default terminal foreground as update success after the exact package, public launcher set, immutable activation, and installed version are verified.
- On failure or cancellation, clear the progress row, return a nonzero status, and print one concise A1-owned result instead of replaying npm's warning wall. Retain bounded captured diagnostics for explicit troubleshooting without exposing them during successful installation.
- Preserve npm as the package manager and dependency resolver. Use fixed argument arrays and explicit quiet/funding/audit flags without mutating user or global npm configuration.
- Detect an existing valid global A1 installation and delegate replacement to its cancellation-safe self-updater rather than performing an unguarded global overwrite. Refuse ambiguous, foreign, or unverifiable existing roots.
- Build, validate, publish, and verify the installer as a second exact npm artifact on Windows, Linux, and macOS, with zero runtime/optional dependencies and no install lifecycle scripts.

## Capabilities

### New Capabilities

- `silent-installer`: Defines the official first-install bootstrap, terminal transcript, target verification, existing-install handling, and failure behavior.

### Modified Capabilities

- `continuous-integration`: Requires the installer artifact to be packed once, independently validated, provenance-published, and registry-verified before release completion.
- `isolated-regression-testing`: Requires exact-package evidence for silent success, concise failure, platform launchers, activation, and warning suppression.

## Impact

- Adds a separately published npm package, `@timurproko/a1-installer`, with its own minimal manifest and tarball but no application runtime dependency graph.
- Affects release packaging/publication, install documentation, package-identity governance, progress rendering conformance, and exact-package validation.
- Does not replace npm, modify npm configuration, remove the existing direct `npm install --global` fallback, resume the postponed stable-launcher design, or change ordinary `a1 update` behavior.
- The canonical preferred stable command becomes `npx --yes --loglevel=error --no-fund --no-audit @timurproko/a1-installer@latest`; `--develop` selects `next`, and `--version <exact-version>` selects an immutable publication. npm bootstrap acquisition errors may still be emitted at error level before the installer can start, but warnings and notices are suppressed.
