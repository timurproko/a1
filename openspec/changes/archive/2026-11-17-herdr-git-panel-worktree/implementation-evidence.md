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

## Approved agent-agnostic refinement

The maintainer requested that shared Herdr directory/UI logic not identify A1 or any other agent. Consumer source commit `69b409eb5846a47a68f63090ac85fd3117b985e6` on the existing MyConfigs PR 3 implements that refinement:

- `src/integration/agent-context/context.js` exposes a pure generic project-directory capability registry. Registration is separate in `providers.js`; shared directory selection and the shell-report facade contain no A1/Claude names, conditions or protocol labels. They consume normalized capability data and preserve native/shell/terminal fallbacks.
- Isolated A1 and Claude Code adapters read their respective supported public/native signals. The Claude companion already reports `session.root()` with its live session identity and heartbeat, so no Claude producer/API change is needed. The existing A1 producer addition supplies the missing equivalent report; no further A1 RPC, private API discovery or polling was introduced.
- Common validation bounds and normalizes paths and checks freshness. Missing, failing, invalid or ambiguous providers fall back safely. Capability reads are terminal-local and independent of optional color/name plugin switches.
- Provider extension is proved with a synthetic third agent registered through the same contract, without directory or Git repository UI edits. Source architecture assertions prohibit agent names in the generic registry, directory resolver and shell facade. Existing session-PR footer parsing and optional color/name features remain separate capabilities outside this focused directory refactor.
- The build injects one canonical provider tree into each sandbox and runtime lib with exact source ownership. Existing directory regression VM loaders were updated for the dependency graph, preserving assertions. The existing wrapped-Claude fixture now supplies the actual producer's current-app and session labels instead of an unbound path/timestamp-only mock.
- Custom unit suite, both-agent packaged Git/directory fixtures, architecture/packaging tests, reviewed host API checks, disposable native fixtures, doctor and all 17 installed native mod checks passed. The external integration suite still stops at the previously recorded unrelated legacy-color assertion at line 823; it is not claimed green.
- Scoped deployment selected only the provider tree, shared shell facade and directory resolver: 122 outputs changed, 846 preserved, none removed; backup `1794925228016-41060`. Doctor reports no issues, 968 owned files, reviewed Herdr 0.1.16. No native binary, layout/preference, terminal topology, Core or agent restart/input was used.
- A concurrent task advanced shared yadm main to unrelated Crew work. This refinement was committed with a task-private alternate Git index and `commit-tree` against the previous consumer topic head, then pushed normally to its existing branch. Shared main, its index and unrelated edits were left unchanged. Only the exact provider-dependency loader hunk from the already-dirty Agents-grouping fixture is included; its unrelated edits remain uncommitted. Unit checks ran in canonical live source with those separately owned changes present; focused capability/packaging fixtures cover the published provider bytes, not acceptance of unrelated work.
- PR 969's earlier CI failure was three DOC005 implementation-comment prefixes, not runtime behavior. Those prefixes are repaired; the same changed-file documentation governance now passes. The 43 focused A1 tests and typecheck also pass after the repair. The pinned strict OpenSpec Validator passes the archived proposal and delta specs with no issues. Direct strict validation of the existing canonical capability reports its inherited placeholder Purpose warning; no canonical spec was hand-edited to hide that baseline issue.

## Known gaps and disposition

No unfinished product implementation tasks. The following bounded validation/rollout limitations remain explicit:

- The broader external `npm run test:integration` stops at `tests/regression/test.mjs:823`: it expects enabling the generic A1 plugin to write the retired color-only `custom.match-agent-session-color` preference. The previous source already contains this stale assertion; neither this task nor its native directory helpers change plugin state. Leave that unrelated test repair with its owner rather than weakening an assertion or changing color behavior in this fix. Unit/focused/native results above are not claimed as a passing integration suite.
- Read-only inspection of this running A1 terminal found native identity but no `a1.cwd`; it still runs the prior immutable producer. A post-deployment desktop screenshot likewise still shows a home-launched old agent's nonrepository fallback. This is expected and is not evidence of successful updated-producer live behavior. A supporting A1 release/development runtime must be launched by its owner when safe on each relevant machine. No live agent was restarted, relabelled, hot-patched or sent input to manufacture a result.
- Live updated-producer attach/switch/detach UI acceptance remains a maintainer check. Disposable fixtures prove routing and invalidation, not real updated-agent interaction. Source implementation and scoped consumer deployment do not imply A1 release publication or integration permission.
- Read-only ownership inventory flags the pre-existing unowned `custom-feedback-preview`; it was left untouched. Scoped deployment and doctor succeeded without adopting or deleting it.
