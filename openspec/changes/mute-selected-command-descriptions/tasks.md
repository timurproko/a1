## 1. Selected autocomplete styling

- [x] 1.1 Generalize the bare-A1 select-list theme adapter so a selected row accents its arrow and primary candidate while styling any aligned description suffix with the existing muted description role; preserve rows without visible descriptions and keep the pinned comparison theme unchanged.
- [x] 1.2 Add focused ANSI-role regression coverage for selected built-in and runtime-provided autocomplete descriptions, selection movement, narrow rows, and the unchanged `a1 pi` comparison path; retain existing skills-tunnel behavior.

## 2. Validation and handoff

- [x] 2.1 Run typechecking, architecture checks, and focused shell/component suites covering autocomplete and the skills tunnel; record any rendering gap explicitly.
- [x] 2.2 Build the reconciled candidate and provide a color-preserving manual test through `./scripts/dev`.
- [x] 2.3 Verify only the selected candidate is cyan while its description remains muted and navigation/completion still behave normally.
