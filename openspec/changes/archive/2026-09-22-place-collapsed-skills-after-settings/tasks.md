## 1. Place the collapsed command

- [x] 1.1 Update bare-A1 autocomplete catalog assembly to insert the synthetic collapsed `skills` command immediately after `settings` and omit it from the resource tail.
- [x] 1.2 Preserve every other built-in and resource command's relative order, including unchanged behavior when no collapsed skill command exists.

## 2. Verify ordering and profile isolation

- [x] 2.1 Add focused autocomplete coverage asserting one collapsed `skills` row after `settings`, before the remaining built-ins, while ordinary resources remain after `quit` in discovery order.
- [x] 2.2 Extend session-shell coverage for the visible collapsed order and confirm expanded mode and `a1 pi` retain their existing catalogs.
- [x] 2.3 Run the focused skills/autocomplete suites and architecture validation; record any gap rather than weakening ordering assertions.
