## 1. Stable runtime package identity

- [x] 1.1 Retain the validated pinned Pi public-package root in the shipped helper and keep same-root configuration idempotent while rejecting a conflicting runtime package identity.
- [x] 1.2 Resolve rewritten lazy module URLs and documented dependency exports from the retained root, independent of later `PI_PACKAGE_DIR` deletion, clearing, or replacement.
- [x] 1.3 Preserve fail-closed diagnostics for missing initial configuration, invalid identity, missing retained installation, traversal attempts, and unavailable exports.

## 2. Regression evidence

- [x] 2.1 Extend focused helper tests to prove environment mutation after configuration cannot break or redirect the lazy Pi image modules used by screenshot attachments or documented dependency resolution.
- [x] 2.2 Verify focused tests, typechecking, architecture checks, and the startup-public build path against the retained-root implementation.
- [x] 2.3 Build and manually submit a screenshot attachment from an A1 session; confirm the prompt starts without the pinned-package configuration error, verify text-only submission remains available, and record the result. Maintainer evidence on 2026-09-29 confirmed attachment send no longer showed the error; the original text-only path remained the working baseline.
