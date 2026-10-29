## 1. Define compact progress geometry

- [x] 1.1 Update self-update presentation coverage to require a 38-cell bar at bounded, partial, and complete percentages and verify the stripped frame retains the existing percentage suffix.
- [x] 1.2 Update installer presentation coverage to require the same 38-cell proportional geometry and verify its selected-accent, track, percentage, and reset styling remain unchanged.

## 2. Shorten both progress renderers

- [x] 2.1 Change self-update progress rendering from 40 to 38 bar cells and verify focused update presentation tests pass.
- [x] 2.2 Change fresh-install progress rendering and its cleanup bound from 40 to 38 bar cells and verify focused installer presentation tests pass without transcript changes.

## 3. Validate compact progress

- [x] 3.1 Run the focused self-update and installer tests, typecheck, and strict OpenSpec validation and verify all complete successfully.

## 4. Unify active tab color

- [x] 4.1 Add native strip coverage proving active Agent, Settings, and Changelog chips consume one shared resolved accent while per-tab status accents remain independent.
- [x] 4.2 Route selected-chip and pending-fill shades through one strip-level active-accent API, remove utility-kind color fallback, and verify the pending Agent fills from its lighter initialized shade into the common settled shade.
- [x] 4.3 Align omitted and explicit native Accent resolution with the owned settings default and verify focused attach and strip tests pass.

## 5. Validate delivery

- [x] 5.1 Run focused progress and native tab-strip tests, typecheck, strict OpenSpec validation, and native formatting checks and verify all complete successfully.
- [x] 5.2 Reconcile the implementation with current `origin/develop`, review the final diff and known-gap disposition, and verify the delivery body and acceptance scenarios describe both UI refinements.
