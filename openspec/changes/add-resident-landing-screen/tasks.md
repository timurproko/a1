# Tasks

Each numbered section is one Implementation item. Every section starts by merging current `origin/develop` and re-checking the names below. Native tests run in CI; focused Rust unit tests also run locally with `cargo test --lib` in `native/terminal-host` when the toolchain is present.

## 1. Landing presentation

- [x] 1.1 Add `native/terminal-host/src/roles/landing.rs`: a pure renderer that takes columns, body rows, the strip position, accent name, version, and cwd, and returns legacy body bytes that clear every body row and draw the header (the three-row half-block `a1` wordmark beside `a1 v<version>` and the shortened cwd) one row and one column from the strip: at the top below a top strip, at the bottom above a bottom strip. Tests: cell fixtures for both strip positions, small and narrow terminals, palette fallback, the Apple Terminal header without the wordmark, and a missing version.
- [x] 1.2 Add the accent table for the landing: per-accent dark `accent` and `border` RGB mirrored from `derivePiAccentProjection`, read from the same profile settings watch, defaulting to purple. Tests: a TypeScript test checks the pinned `landing_accents.json` against the projection for every accent and the Rust table is asserted against the same file.
- [x] 1.3 Present the landing from `roles/attach.rs` whenever no tab is shown after tabs were shown: the landing bytes become the frame's legacy body with no cursor, the version is read once from the release root's `package.json`, and the strip, clock ticks, hover, popups, and notices compose over it as today; a Settings tab this client is opening from the landing is not closed as an orphaned hidden Settings tab. Tests: presentation fixtures for the landing under a top and a bottom strip with no cursor, the release version reader, and opening Settings from the landing by shortcut and launcher.

## 2. Architecture record

- [x] 2.1 Record the landing under Decision 11 in `docs/architecture/resident-tabs.md`.
