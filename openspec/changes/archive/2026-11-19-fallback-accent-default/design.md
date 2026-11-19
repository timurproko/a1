## Decision

The default accent is one constant, `DEFAULT_UI_ACCENT_COLOR` in `src/contracts/owned-ui`, beside the list of accent
colours. The `accentColor` and `defaultAccentColor` declarations and the owned UI fallback all read it, so the default
has a single source. Reading the declarations module directly from `owned-ui.ts` was rejected: it pulls the settings
declarations into the startup graph and exceeds its size budget.

The legacy `"default"` mapping in `src/foundation/release/early-accent.ts` is a compatibility path for explicitly
saved values and is left unchanged.
