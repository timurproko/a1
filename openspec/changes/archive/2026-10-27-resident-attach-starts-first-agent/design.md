# Design

## Context

`handle_lifecycle("attach.start")` in `roles/server/lifecycle.rs` calls `attach_start_tab`, which, with no requested session, returns `default_tab()` and starts it only when `agentless()` holds. `agentless()` (`roles/server/mod.rs`) is true only when every registry record is a utility tab; `default_tab()` prefers a running Agent, then any running tab, and falls back to the literal `tab-1`. A record whose child exited (`desired: stopped`, `lifecycle: stopped`, no holder) stays in the registry; `prune_stopped_records` only trims them beyond `MAX_STOPPED_RECORDS` (16). Closing a tab removes its record (`roles/server/holder.rs`), which is why Alt+W-then-relaunch works while exit-then-relaunch does not.

On the client (`roles/attach.rs`), `registry_tabs` filters `lifecycle == "stopped"` out of the strip, `has_shown_tabs` is set only once a non-empty strip was presented, and `landing_shown()` requires `has_shown_tabs`. A fresh attach whose first list contains only stopped records therefore paints nothing: no tab, no landing, no notice. `should_paint_strip` likewise needs a surface, shown tabs, or a notice.

The pre-#837 code had the same server gate. The case was rarely hit because Agents normally keep running between attaches; the interrupted automatic update of 2026-10-27 stopped every tab at once and exposed it.

## Goals and non-goals

- Goal: bare `a1` on a profile whose Agents have all stopped behaves like a first launch: one new Agent starts in the launch cwd and is viewed through the existing first-draw gate.
- Goal: a fresh attach never shows an empty body; with no running tab it shows the landing and its `+` launcher.
- Non-goal: resuming the stopped tabs' sessions automatically; `a1 --session <id>` and the exit notice remain the resume path.
- Non-goal: changing standby promotion, utility tab prewarming, close semantics, or the strip presentation of running tabs.

## Decisions

1. **Stopped, holder-less Agent records count as absent for the start decision.** `attach_start_tab` first checks whether any Agent record is not stopped. When none is, it prunes every stopped holder-less Agent record, then starts a new Agent: `tab-1` when the registry holds no Agent record at all (preserving today's first-launch id and tests), otherwise a fresh `tab-<hash>` so the new tab never adopts a stale `tab-1` data directory, draft, or recovery screen. Utility records (Settings, Changelog) are left alone so a prewarmed Settings stays hidden beside the new Agent as today. `agentless()` keeps its current meaning for the standby and Settings logic; the new check lives in `attach_start_tab` so no other caller changes behaviour.
2. **Landing on the first empty list.** `landing_shown()` becomes true when the view has no tab, no create is pending, and either tabs were shown before or the first registry list has been received with no running tab. The first-draw gate for a tab the server is starting is unaffected: that list carries the starting tab, so the landing is not shown while an Agent start is pending. `should_paint_strip` follows the same rule so the strip with `+` and the clock appears with the landing.
3. **Tests.** A server unit test for `attach_start_tab` with only stopped Agent records (new id, pruned records, start requested) and with a mix of stopped and running Agents (existing running Agent viewed, nothing pruned). A client presentation test that a first list of stopped-only tabs paints the landing. A role-level integration test that stops every tab, reattaches, and sees a new Agent chip and surface.

## Risks / Trade-offs

- Pruning stopped records on attach drops them from `a1 tabs` listings sooner than the 16-record cap did; their sessions remain resumable by id through the exit notice.
- A profile with stopped Agents and a running hidden Settings tab now starts an Agent; the "lone hidden Settings" scenario already requires that.

## Migration Plan

No persisted-data migration. Existing registries with stopped Agent records are repaired by the first attach. Rollback restores the previous gate; `a1 tabs host stop` remains the manual workaround.
