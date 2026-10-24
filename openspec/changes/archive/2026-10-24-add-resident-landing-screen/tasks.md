# Tasks

Each numbered section is one Implementation item. Every section starts by merging current `origin/develop` and re-checking the names below. Native tests run in CI; focused Rust unit tests also run locally with `cargo test --lib` in `native/terminal-host` when the toolchain is present.

## 1. Landing presentation

- [x] 1.1 Add `native/terminal-host/src/roles/landing.rs`: a pure renderer that takes columns, body rows, the strip position, accent name, version, and cwd, and returns legacy body bytes that clear every body row and draw the cwd flush left on the second-to-last body row with the footer's home formatting, `a1 v<version>` below it, and the three-row half-block wordmark above it. Tests: cell fixtures for the footer-aligned layout, both strip positions, small and narrow terminals, footer cwd formatting, palette fallback, the Apple Terminal layout without the wordmark, and a missing version.
- [x] 1.2 Add the accent table for the landing: per-accent dark `accent` and `border` RGB mirrored from `derivePiAccentProjection`, read from the same profile settings watch, defaulting to purple. Tests: a TypeScript test checks the pinned `landing_accents.json` against the projection for every accent and the Rust table is asserted against the same file.
- [x] 1.3 Present the landing from `roles/attach.rs` whenever no tab is shown after tabs were shown: the landing bytes become the frame's legacy body with no cursor, the version is read once from the release root's `package.json`, and the strip, clock ticks, hover, popups, and notices compose over it as today; the landing prewarms a hidden Settings tab and keeps it running so Settings opens at once, a lone hidden Settings closes on detach, and an attach ignores a lone Settings tab when choosing and starting its first Agent. Tests: presentation fixtures for the landing under a top and a bottom strip with no cursor, the release version reader, and the landing prewarm.

## 2. Hand-over and canvas

- [x] 2.1 Wipe the wordmark from the right into a white caret cell over 180 ms when this client starts an Agent from the landing, holding that cell until the Agent's first frame commits and restoring the wordmark when creation is refused. Tests: wipe frames at start, midway, completion, and hold.
- [x] 2.2 Paint the landing with the `backgroundStyle` canvas an Agent tab uses, read live with the other presentation settings, and draw the cwd and version in the footer's `dim`. Tests: canvas fill and reset restoration, transparent and palette modes, and the pinned canvas and `dim` values checked against the theme.

## 3. Architecture record

- [x] 3.1 Record the landing under Decision 11 in `docs/architecture/resident-tabs.md`.
