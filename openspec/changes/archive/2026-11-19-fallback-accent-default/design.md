## Decision

Replace the literal with `OWNED_SETTING_DECLARATIONS.accentColor.defaultValue`, so the declaration stays the single
source of the default. The legacy `"default"` mapping in `src/foundation/release/early-accent.ts` is a compatibility
path for explicitly saved values and is left unchanged.
