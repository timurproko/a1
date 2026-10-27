# Tasks

Each numbered section is one Implementation item.

## 1. The server starts a new Agent when every Agent has stopped

- [x] 1.1 In `native/terminal-host/src/roles/server/lifecycle.rs`, make `attach_start_tab` detect that no Agent record is running, prune stopped holder-less Agent records, and start `tab-1` for a registry without Agent records or a fresh `tab-<hash>` otherwise; admission names that fresh id and reserves it per client so the surface subscription it takes and the started tab agree, and admission never selects a stopped record as the view. Tests: unit tests in the server module for stopped-only, mixed, empty, and utility-only registries, and for admission of a stopped record.
- [x] 1.2 Add a role integration test in `native/terminal-host/tests/role_integration.rs` that closes the only Agent from a client, leaves its stopped record behind, reattaches without a session, and observes one new Agent with its first drawn surface and the stopped record dropped.

## 2. The client shows the landing on a first list with no running tab

- [x] 2.1 In `native/terminal-host/src/roles/attach.rs`, let a received registry list with no running tab and no pending create count as the strip shown empty, so the landing, `+`, and clock paint immediately; a listed starting tab keeps the first-draw gate. Tests: a unit test of the gate for a stopped-only first list, a starting-tab first list, and a pending Agent; the cold-attach role test keeps its named first strip.

## 3. Documentation

- [x] 3.1 Describe the stopped-Agent start, the admission reservation, and the first-list landing in `docs/architecture/resident-tabs.md` where the landing and first Agent start are covered.
