## 1. Stable runtime package identity

- [ ] 1.1 Retain the validated pinned Pi public-package root in the shipped helper and keep same-root configuration idempotent while rejecting a conflicting runtime package identity.
- [ ] 1.2 Resolve rewritten lazy module URLs and documented dependency exports from the retained root, independent of later `PI_PACKAGE_DIR` deletion, clearing, or replacement.
- [ ] 1.3 Preserve fail-closed diagnostics for missing initial configuration, invalid identity, missing retained installation, traversal attempts, and unavailable exports.

## 2. Regression evidence

- [ ] 2.1 Extend focused helper tests to prove environment mutation after configuration cannot break or redirect lazy Pi module and dependency resolution.
- [ ] 2.2 Verify focused tests, typechecking, architecture checks, and the startup-public build path against the retained-root implementation.
- [ ] 2.3 Build and manually exercise an A1 session through an edit-result rendering path; confirm the lazy renderer completes without the pinned-package configuration error and record the result.
