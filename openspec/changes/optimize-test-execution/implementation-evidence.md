# Implementation evidence and coverage ledger

## Baseline (stage 1)

Base: `14caed95de8937409bd4153a8880e7b77767f047`. Inventory after adding the report test: 497 retained Vitest files (496 at the base), each with one coarse owner and ordinary/resource/integration classification. Raw downloaded evidence and generated reports are ignored under this worktree's `.artifacts/agent/`.

| Existing run | Source | Workflow elapsed | Longest job | Interpretation |
| --- | --- | --- | --- | --- |
| Full 40052325440 | 077e5c41 | 1079 s | Windows Node 22 predecessor, 1014 s | Newer baseline; not current implementation evidence |
| Full 39708423610 | 8791e02d | 1322 s | Windows Node 24 predecessor, 1252 s | Original analysis baseline |
| Development 40117954998 | dfd17982 | 1602 s | Windows native role partition, 921 s | Native work and preparation dominate; not a generic unit-only PR |

Full 40052325440 Windows Node 24 rendering file times: full matrix 206642 ms; smoke 52032 ms; scheduled content 14332 ms; input full 11794 ms; input smoke 9523 ms. Smoke captures are repeated work, but their unique assertions must survive. Approximately 61555 ms of observed rendering-lane work is addressable; this is not a promised end-to-end reduction. Runner sum (8100000 ms), longest job, runner span, and workflow elapsed are different metrics; unavailable queue/DAG timing remains null.

Windows Node 22 predecessor evidence attributes exact-package preparation to install 157932 ms and installed identity 406 ms. Large savings require reducing npm reification or predecessor work without reducing coverage; the safe within-lane identity improvement is modest and must not be portrayed as fixing the critical path.

## Consolidation / retention decisions

| Work | Decision | Retained authority |
| --- | --- | --- |
| Rendering smoke/full workload capture | Consolidate equivalent captures | Full matrices plus shared smoke assertions; standalone smoke remains |
| Scheduled content in smoke and content-producer | Execute once per gate | Same helper/workload list, owned and independent pinned producers |
| Input smoke/full workload capture | Consolidate equivalent captures | Full input matrices plus shared smoke assertions |
| Source versus emitted helper/worker tests | Retain | Loader/entry contract and real packaged protocol are different |
| Unit versus shell integration | Retain uncertain overlap | Event ordering, asynchronous completion, lifecycle and cleanup differ |
| Pinned parity versus owned unit checks | Retain | Independent upstream oracle is not replaceable by self-asserted expected output |
| Platform/runtime-specific tests | Retain | Windows Node 22/24, Linux and macOS remain distinct authority |
| Cleanup/finalization/release failure and race cases | Retain; optimize setup only | Real Git/filesystem/process operations and original deadlines |
| Published predecessor and direct/bridged update cases | Retain | Real previous release code, three predecessors, fresh installations |
| Package pre/post consumer identity verification | Retain | Detect mutable/tampered prepared bytes; never cache a passing outcome |

## Delivered structural changes

- Full rendering now selects only active isolated scopes; full input/rendering consume the shared smoke assertions. The two superseded smoke files have explicit executed replacements, and the complete file-assignment test rejects any unaccounted omission or duplicate. Full matrix/protocol counts are derived against the retained workload declarations: 73 + 10 launches instead of additionally repeating smoke's 19.
- The final audited inventory has 502 files (496 at the initial base plus six focused regression files); every file retains its coarse owner and execution class. More tests is intentional where cheap orchestration/isolation contracts prevent future coverage loss; file count itself is not a latency metric.
- Nine reviewed refinements retain explicit minimum consumers and add bounded transitive consumers across operational/test roots. Unsupported, absent, deleted, unreviewed, mixed changed-test/shared-support, invalidator and manual authority retain coarse/conservative selection. Consumer integration links retain their source reasons. The same-current-inventory comparison below isolates policy effects rather than comparing different source populations.
- CLI transcripts start four independent producer/color loaders rather than 22. Every command and exact comparison still executes; per-request homes/settings, both aliases/colors, output emphasis, syntax, error scenarios, and warning order remain tested. Producers are neither retried nor restarted after failure; teardown awaits their closure.
- Cleanup writes each private real repository's configuration once instead of four config/remote subprocesses. Release fixtures replace two baseline ref commands with one real atomic Git transaction. Fresh roots/remotes, real histories and lifecycle failures remain; no fixture setup is moved outside its scenario deadline. Finalization's real publication/race cases remain unchanged because no further safe equivalent reduction was demonstrated.
- Package preparation and every consumer verification retain the same digest contract while parsing the manifest during the payload walk and discarding buffers after each file hash. Pre/post checks, fresh prefixes, independent shards, three predecessors, protected direct/bridged updates, startup first attempts and Defender are unchanged. Npm installation remains the large irreducible measured cost in the reviewed evidence.

| Representative path | Former coarse ordinary/resource files | Refined ordinary/resource files | Integration disposition |
| --- | --- | --- | --- |
| check-docs-governance.mjs | 158 / 5 | 9 / 1 | No unrelated product integrations |
| check-environment.mjs | 25 / 3 | 7 / 0 | No unrelated startup/launch integrations |
| system-clipboard.ts | 138 / 10 | 79 / 9 | All three existing Pi/image/history links retained |
| scrollbar.ts | 69 / 0 | 109 / 5 | Wider on purpose: shell/composition consumers are not dropped |

## Focused local evidence

These are local working-tree checks, not successful exact-head hosted CI or performance certification.

- `npm run build:core`: passed; creates the emitted modules required by bin typechecking and real targeted fixtures.
- `npm run typecheck`: passed after build prerequisites were present.
- Explicit policy, selection, suite ownership, full-shard, preparation/tampering, budget-policy, and negative-control files: 14 files / 178 tests passed. Invoked with explicit filenames, serial file scheduling and the retained 30000 ms explicit bound; log in `.artifacts/agent/focused-checks.log`.
- Explicit package parity, capture-failure, real Git isolation and existing release-command files: 4 files / 44 tests passed. Existing package parity plus new independence control: 12 tests, 6476 ms locally; this is not a comparable hosted speedup claim.
- `npx vitest run test/repository-governance/local-cleanup.test.ts --no-file-parallelism`: 1 passed, including its three dependency-free Node suites; 70670 ms locally, original limits unchanged.
- Explicit full/smoke rendering and input files: 4 files / 6 tests passed; shared smoke assertions passed against the real independent full captures. Local file times 114348, 8714, 31233 and 5764 ms respectively; not comparable to hosted baseline durations.
- Strict OpenSpec validation: passed.

## Limitations and dispositions

- Hosted before/after timing is not claimed. Existing completed-run observations establish cost categories, while exact-head selected CI remains the authority after finalization; no background watcher or semantic retry is started.
- UI consumer retention may widen selected coverage and is explicitly preferred over an unsafe numerical reduction. Unknown/dynamic cases retain the reviewed floor and coarse fallback where authority is unavailable; graph reachability never independently authorizes empty coverage.
- No further broad test deletion, mutable fixture seeding, warm startup substitution, cross-shard installation sharing, predecessor-count reduction, or verification caching was justified. The remaining latency is retained rather than hidden.
- Queue and DAG critical-path measurements are explicitly unavailable in the observational report; runner span and longest job are not mislabeled as critical path.
- All seven approved stages are implemented through the documented code/contract outcomes; no required implementation behavior is deferred to manual validation or future performance evidence.
