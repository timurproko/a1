## 1. Default marker presentation

- [x] 1.1 Render the configured default with the literal `[default]` marker after the optional active checkmark and before the description; verify coincident and differing active/default levels use the exact intended order.
- [x] 1.2 Include the complete level/checkmark/default-marker region in description-width accounting; verify selected and unselected descriptions remain aligned before and after filtering, including narrow rendering.
- [x] 1.3 Update the source-port ledger to describe the bracketed marker while preserving the comparison profile's public selector.

## 2. Regression validation and handoff

- [x] 2.1 Run typechecking and focused thinking-selector and shell-workflow tests; verify filtering, navigation, selection, default persistence, cancellation, semantic marker styling, footer restoration, and profile isolation remain intact.
- [x] 2.2 Build the candidate and prepare manual checks through `./scripts/dev` and `./scripts/dev pi`; verify bare A1 shows `✓ [default]` when active and default coincide, represents differing states independently, retains aligned descriptions, and leaves the comparison selector unchanged.
