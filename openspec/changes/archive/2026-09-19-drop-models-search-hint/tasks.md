## 1. Drop the hint

- [x] 1.1 Remove `argumentHint` from the bare `models` entry in `OWNED_BUILTIN_SLASH_COMMANDS` and from the bare built-in addition in `PiResourceCatalog`; verify the pinned `model` entry keeps `<provider/model>`.
- [x] 1.2 Update the engine workflow test that asserted the hint; run `npm run typecheck`, `check:architecture`, and the focused engine, catalog, shell models, and shell component suites.
