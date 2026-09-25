## Why

The bare-A1 `/thinking` selector currently advertises `Ctrl+S to set as default` and `Escape/Ctrl+C to cancel`, so saving is an immediate combined action and the footer does not match the concise interaction grammar of the Models dialog. The selector should let the user stage a default with Space, save it explicitly with Ctrl+S, and reserve closing for Escape.

## What Changes

- Make Space stage the highlighted thinking level as the desired default and immediately move the `[default]` marker without closing the selector.
- Make Ctrl+S persist the staged default through the existing thinking workflow; Enter continues selecting a session level.
- Stop treating Ctrl+C as cancel for this selector so only Escape closes it.
- Replace the verbose footer with the compact hints `Enter select  Space default  Ctrl+S save  Esc close`.
- Keep filtering, navigation, active/default marker independence, aligned descriptions, footer restoration, and the `a1 pi` comparison selector unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define the bare-A1 thinking selector's staged default interaction, explicit save action, Escape-only close behavior, and compact shortcut footer.

## Impact

- Affects the owned bare-A1 thinking selector and its focused component and shell-workflow tests.
- Does not change available thinking levels, cycle order, persisted settings format, keybinding configuration, dependencies, or the `a1 pi` comparison profile.
