## Why

`test/integrations/pi/session-ui/session-shell.test.ts` is 6,133 lines and 133 cases covering everything the owned session shell does: paste and clipboard, transcript selection, links and hover, prompt suggestions, quit and restoration, viewport streaming, prompt history, dialogs and workflows, command presentation, and a real-engine compaction suite. It is the most-changed file in the repository; every feature and every planned adapter extraction touches it, so unrelated changes collide there and each collision costs a rebase of the whole file. The adapter split that follows (transcript projection, event delivery, workflows, services) needs to move its cases one concern at a time, which the monolith makes a hand-sort each time.

## What Changes

- Move the shared doubles and fixtures (`Session`, `Runtime`, `InputImmediateScheduler`, `fixture`, `observedPasteFixture`, `withPinnedHyperlinks`, `nextImmediate`) into `session-shell-fixture.ts`, exported, importing only what they use.
- Split the 133 cases verbatim into ten files by concern: `session-shell-compaction`, `-paste`, `-selection`, `-links`, `-suggestions`, `-lifecycle`, `-viewport`, `-history`, `-workflows`, and the remaining command, notice, and presentation cases under the original `session-shell.test.ts` name so existing coverage references stay valid. The largest part is 1,224 lines.
- Add `session-shell-paste.test.ts` to the serial resource-sensitive partition (its cases fork helpers and hold a durable history worker) and update the ownership and partition expectations, including the impact-selector proof that the suggestion fixture now reaches only the two suites that use it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: test suites are bounded by concern and split verbatim along source seams, with shared fixtures in one module and partitions following the cases.

## Impact

Test-only. 301 cases pass across the ten files, the same count the monolith ran. No source changes. The ANSI-literal reduction the plan lists under the same item (413 escape literals, now spread 1 to 112 per file) is left for the extraction changes that rewrite each concern's assertions anyway. Source-ledger, provenance, and workflow-outcome coverage entries that name `session-shell.test.ts` still resolve; the ledger work re-points them per record.
