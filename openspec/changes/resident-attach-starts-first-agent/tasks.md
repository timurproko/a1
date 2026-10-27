# Tasks

Each numbered section is one Implementation item.

## 1. The server starts a new Agent when every Agent has stopped

- [ ] 1.1 In `native/terminal-host/src/roles/server/lifecycle.rs`, make `attach_start_tab` detect that no Agent record is running, prune stopped holder-less Agent records, and start `tab-1` for a registry without Agent records or a fresh `tab-<hash>` otherwise; keep the requested-session and running-Agent paths unchanged. Tests: unit tests in the server module for stopped-only, mixed, empty, and utility-only registries.
- [ ] 1.2 Add a role integration test in `native/terminal-host/tests/role_integration.rs` that lets every tab exit, reattaches without a session, and observes one new Agent chip with its first drawn surface.

## 2. The client shows the landing on a first list with no running tab

- [ ] 2.1 In `native/terminal-host/src/roles/attach.rs`, let `landing_shown` and `should_paint_strip` treat a received first registry list with no running tab and no pending create as a shown-empty strip, so the landing, `+`, and clock paint immediately; keep the first-draw gate for a starting tab. Tests: presentation tests for a stopped-only first list, a starting-tab first list, and the existing last-tab-close landing.

## 3. Documentation

- [ ] 3.1 Describe the stopped-Agent start and the first-list landing in `docs/architecture/resident-tabs.md` where the first Agent start is covered.
