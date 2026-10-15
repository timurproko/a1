## 1. Correct resident surface coordinates

- [x] 1.1 Pass the unmodified outer-terminal row into the resident attach mouse encoder and keep the encoder as the single strip-offset boundary.
- [x] 1.2 Preserve attach-owned row-zero tab interactions and unchanged column, event-kind, and SGR one-based encoding behavior.

## 2. Prevent regression

- [x] 2.1 Add focused native assertions that the first and later child surface rows encode without displacement for hover and activation reports.
- [x] 2.2 Retain explicit coverage that the tab-strip row has no child coordinate and cannot be forwarded.

## 3. Validate delivery

- [ ] 3.1 Run the focused native tests, required repository preflight, strict OpenSpec validation, and diff checks; record evidence and any explicit known-gap disposition.
