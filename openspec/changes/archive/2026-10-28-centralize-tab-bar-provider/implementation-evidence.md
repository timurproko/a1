# Implementation evidence

## Provider contract

- `native/terminal-host/src/core/tab_bar.rs` is the single native declaration for Agent, Settings, and Changelog metadata and policies.
- Attach activation, command-palette entries, plus-menu entries, context-menu renameability, singleton visibility/prewarming, registry validation, Agent-session ownership, singleton reservation, and child route delivery consume provider declarations.
- Singleton visibility state is stored in provider order rather than concrete Settings and Changelog fields.

## Ordering

- `append_live_tab` appends cold-created and promoted standby tabs after the final live record without consulting kind.
- `move_live_tab_last` places a hidden singleton at the final live slot when it joins the strip; already shown tabs bypass it and retain dragged order.
- Focused server regressions cover Agent → Settings → Agent ordering, dragged order, singleton message resolution, and stopped records around live tabs.

## Local checks

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo check --tests` passed.
- `npm run build:core` passed.
- `npm run typecheck` passed.
- `npx openspec validate centralize-tab-bar-provider --strict` passed.
- Native unit execution was not available locally because no trusted Windows `terminal-vt` artifact was published and Zig was unavailable; exact-head CI remains the validation authority.
