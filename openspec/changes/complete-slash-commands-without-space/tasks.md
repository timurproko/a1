## 1. Delimiter-ready command completion

- [ ] 1.1 Add focused failing tests for both bare-A1 history modes proving Tab completes ordinary and argument-bearing top-level command rows to `/<name>` with no trailing space, while Enter still submits the selected command and `a1 pi` retains pinned spacing.
- [ ] 1.2 Add a bare-A1 autocomplete-provider adapter that delegates completion and removes only the generated top-level command spacer, preserving original suffix text, cursor placement, undo/change handling, and non-command completions.

## 2. Tunnel and argument safeguards

- [ ] 2.1 Verify Tab-completing `skills` and then typing `:` immediately opens the existing `/skills:` tunnel, with its filtering, row labels, application, submission rewrite, and extension-wrapper composition unchanged.
- [ ] 2.2 Verify typing a space after a completed argument-bearing command still opens and applies its existing argument completions, while path/resource and comparison-profile completions remain unchanged.

## 3. Validation

- [ ] 3.1 Run the focused shell autocomplete and skills-tunnel tests in both history modes, type checking, strict OpenSpec validation, and `git diff --check`; resolve failures without broadening command or colon semantics.
