## 1. Correct the opening state

- [x] 1.1 Initialize a pointer-opened Settings value menu with no active entry while retaining the effective value's marker and keyboard starting index.
- [x] 1.2 Preserve existing pointer entry, pointer leave, direct activation, outside dismissal, and keyboard navigation behavior.

## 2. Add focused regression coverage

- [x] 2.1 Prove a newly pointer-opened menu has no active row while its effective value remains marked.
- [x] 2.2 Prove pointer motion onto a menu row highlights it, motion outside clears it, and keyboard navigation still starts from the effective value.

## 3. Validate the delivered behavior

- [x] 3.1 Run focused Settings/value-menu tests and typechecking permitted by repository policy; record results and any explicit gap disposition in implementation evidence.
- [x] 3.2 Build the interactive candidate and provide a color-preserving Settings handoff covering open, pointer entry/leave, and selection.
