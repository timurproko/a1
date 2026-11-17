# Implementation evidence

## Active project reporting

A1 commits `553737a4` and `2e9e3246` extend the existing endpoint-ready Herdr reporter with `a1.cwd` and `a1.cwd.binding`. The directory comes from the active backend identity, not process.cwd, history storage or a pending target. Publication, heartbeat, replacement and owned cleanup retain existing generation/settlement fencing. Directory tokens bind the exact runtime/session/timestamp tuple, preventing an older identity-only producer from making an orphan path appear fresh.

- Focused Vitest: 43 tests passed across `herdr-reporter`, `herdr-readiness` and `runtime-api-lifecycle`.
- Fixtures cover home launch, worktree context replacements, detach/completion destinations, queued/failed context preservation, endpoint readiness, delayed old callbacks, identity-only predecessor handoff, foreign labels/tokens, heartbeat/cleanup, literal Windows/UNC/POSIX/Unicode paths and invalid/oversized paths.
- Full product build, typecheck, strict OpenSpec validation and diff whitespace checks passed. Typecheck initially needed the clean checkout's generated dist; building resolved those missing generated imports without changing source scope.

## External Herdr consumer

Canonical source: `C:/Users/tprokopiev/.config/herdr-app/customizations/`, yadm repository `timurproko/MyConfigs`.

- Source commits `db5c6d30` and `d2e05b50e3f69fc41e1715af89de002bb02983d8`, published to branch `fix/herdr-git-panel-worktree` and draft PR https://github.com/timurproko/MyConfigs/pull/3.
- Consumer PR is stacked on existing `feature/herdr-agent-session-names` so this task's two commits remain separate from that earlier work. No merge was requested or performed.
- `src/integration/herdr/terminal-labels.js` validates complete fresh native identity, exact publication token and bounded absolute directory. `src/ui/directory.js` prioritizes it only for a currently reported A1 terminal. All other fallback ordering remains unchanged. Existing source maps already package these shared helpers into Git and other directory consumers.
- Focused `terminal-labels` and packaged `git-location` fixtures passed, including stale/future/partial/invalid reports, downgrade refresh mismatch, stale Node cwd, local/remote routing, worktree changes, detach and stale Git results.
- Entire Custom unit suite passed. Reviewed host API check, disposable native fixture suite, doctor and all 17 installed native mod checks passed.
- Scoped deployment selected only `src/integration/herdr/terminal-labels.js` and `src/ui/directory.js`: 32 generated outputs changed, 856 preserved, none removed. Latest backup `1794923338080-29356`. Doctor reports no issues on reviewed Herdr 0.1.16. No layout/preference, native binary, Core, agent or terminal topology change was made by deployment.
- Unrelated existing uncommitted README/architecture, Agents grouping and inline-rename edits were preserved and not staged. Source commits used ordinary Git against the yadm repository to avoid its unrelated automatic preference-export staging. The first yadm push wrapper independently reported restarting AutoHotkey and logi-mouse-follow helpers; herdr-shell was already current and Paseo autostart excluded. No manual process-management action was taken; the later push used ordinary Git.

SHA-256 of the canonical external files at `d2e05b50`:

```text
2b89c7fb51febda022b6f817d265f268b81909542f41a951a2f95a6cc3818ad1 src/integration/herdr/terminal-labels.js
61b68e0aecff78100fbb6231e14e5ec8abca46a01b76c57a87f32cf2cf41d844 src/ui/directory.js
77a374a5d6c51551dfb6662f2718ef06c9f19c356bd6ed7e88cf3e2da8621742 tests/terminal-labels.test.mjs
1a0b9be77876781e078111dc9d05a1ae225168d5e0db9bd71bab20e68720b755 tests/git-location.test.mjs
51091924ce2bbeda8eb33261b1e1264df94d5f7730f20d26c6d4ee5b07294785 docs/A1-PROJECT-DIRECTORY.md
```

## Known gaps and disposition

No unfinished product implementation tasks. The following bounded validation/rollout limitations remain explicit:

- The broader external `npm run test:integration` stops at `tests/regression/test.mjs:823`: it expects enabling the generic A1 plugin to write the retired color-only `custom.match-agent-session-color` preference. The previous source already contains this stale assertion; neither this task nor its native directory helpers change plugin state. Leave that unrelated test repair with its owner rather than weakening an assertion or changing color behavior in this fix. Unit/focused/native results above are not claimed as a passing integration suite.
- Read-only inspection of this running A1 terminal found native identity but no `a1.cwd`; it still runs the prior immutable producer. A post-deployment desktop screenshot likewise still shows a home-launched old agent's nonrepository fallback. This is expected and is not evidence of successful updated-producer live behavior. A supporting A1 release/development runtime must be launched by its owner when safe on each relevant machine. No live agent was restarted, relabelled, hot-patched or sent input to manufacture a result.
- Live updated-producer attach/switch/detach UI acceptance remains a maintainer check. Disposable fixtures prove routing and invalidation, not real updated-agent interaction. Source implementation and scoped consumer deployment do not imply A1 release publication or integration permission.
- Read-only ownership inventory flags the pre-existing unowned `custom-feedback-preview`; it was left untouched. Scoped deployment and doctor succeeded without adopting or deleting it.
