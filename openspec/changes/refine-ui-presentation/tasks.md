## 1. Define compact progress geometry

- [x] 1.1 Update self-update presentation coverage to require a 38-cell bar at bounded, partial, and complete percentages and verify the stripped frame retains the existing percentage suffix.
- [x] 1.2 Update installer presentation coverage to require the same 38-cell proportional geometry and verify its selected-accent, track, percentage, and reset styling remain unchanged.

## 2. Shorten both progress renderers

- [x] 2.1 Change self-update progress rendering from 40 to 38 bar cells and verify focused update presentation tests pass.
- [x] 2.2 Change fresh-install progress rendering and its cleanup bound from 40 to 38 bar cells and verify focused installer presentation tests pass without transcript changes.

## 3. Validate delivery

- [x] 3.1 Run the focused self-update and installer tests, typecheck, and strict OpenSpec validation and verify all complete successfully.
- [ ] 3.2 Reconcile the implementation with current `origin/develop`, review the final diff and known-gap disposition, and verify the delivery body and acceptance scenarios describe the compact shared geometry.
