# Herdr screenshot-paste implementation evidence

## Delivered behavior

- `clipboard-paste-policy.ts` separates raw acquisition from copy destination. Conventional SSH/WSL/tmux/screen markers still deny native reads. Other raw Herdr paste permits only host image representations; native text and file-drop fallback are excluded. Explicit clipboard ports remain first.
- `response-copy-policy.ts` contains the unchanged Herdr-aware destination predicate, consumed by the existing isolated copy transport. Selection autocopy and explicit copy retain exact single bounded OSC 52 submission, no native/platform write or fallback, and unverified delivery semantics.
- `PasteSource.imagesOnly` crosses the helper boundary as `native-image`; source and emitted tests observe image probes/reads only. Empty/unavailable screenshot acquisition uses the fixed `paste-screenshot` diagnostic: `Couldn’t paste screenshot—try again.`
- Supplied text remains authoritative, exactly once, and does not capture a native source. A supplied single existing PNG/JPEG/WebP/GIF/BMP path is classified in the existing text worker, then enters the serialized image queue as `prepare-file`. The image worker opens a regular file, enforces the 20 MiB source cap before allocation, reads at most the stat size plus one growth-detection byte, detects size changes, closes the handle, and reuses existing byte/MIME/pixel/conversion/output validation.
- Prepared file images become actual screenshot attachments, with canonical bytes, submission/steering/follow-up, atomic editing, and history-sidecar behavior inherited from the existing image pipeline. Non-image files, folders, URLs, ordinary prose, missing paths, and multiple/mixed path lists keep their existing semantics.
- Text candidates retain provisional image capacity until classification finishes. An out-of-order second file cannot evade the prompt image limit while an earlier text candidate may still become an image.
- Sanitized file-read failures remove their reservation rather than leave a failed chip; later typing stays intact. Invalid images and known size/count/format failures retain existing actionable diagnostics. No failed supplied-content request triggers native acquisition.
- Optional settings/comparison native writing is dynamically loaded on demand, retaining bounded settings-copy admission and the captured comparison-write promise. This keeps the reader module off the eager startup graph without raising any architecture budget.

## Implementation progression

- Outcome 1: `68858648` — independent raw image-only acquisition, retry diagnostic, real production-gate shell tests, native helper/source/emitted coverage, and preserved text/copy behavior. Tasks and the PR outcome were checked immediately after this outcome's code/tests were committed and pushed.
- Outcome 2: `20eadd3d` — bounded supplied-file image preparation, attachment-backed adoption, image-capacity race prevention, and source/emitted/shell lifecycle tests. Tasks and the PR outcome were checked before documentation work.
- Follow-up repair: `c78f0f49` — extracted the unchanged copy predicate into its independently consumed policy module; deferred optional native writers so the startup budget remains intact; retained the cold-helper test seam while forwarding the new image-only intent. Added bounded settings-copy composition coverage.
- Outcome 3 updates architecture documentation and specification deltas, records this evidence and the remaining ownership limitation, and retains historical PR #922 artifacts unchanged. Exact final head and CI state belong in the handoff, not a self-invalidating evidence commit.

## Automated validation

The task checkout was built successfully with `npm run build`. `npm run typecheck`, `npm run check:architecture`, strict OpenSpec validation, and `git diff --check` passed. Architecture validation includes session-writer, identity, startup graph, and pinned-source-ledger checks; no thresholds or required checks were weakened. The final delivery-body check passed, and non-mutating delivery finalization inspection reported `would-finalize`; canonical specs and archival remain automation-owned. Fresh `origin/develop` remained `82d030bf4ca4ec5f92785ade04f5317bc9815658` and was verified as an ancestor before the final outcome.

Final clipboard/image boundary run: **265 tests passed across 12 exact owning files**, with file parallelism disabled to avoid contention among cold helpers and workers:

```bash
cd /d/Git/a1/.worktrees/herdr-image-paste && npx vitest run test/app/session-shell/clipboard-paste-policy.test.ts test/app/session-shell/herdr-clipboard.test.ts test/app/session-shell/response-copy-transport.test.ts test/app/session-shell/system-clipboard.test.ts test/app/session-shell/clipboard-acquisition.test.ts test/app/session-shell/paste-preparation-client.test.ts test/app/session-shell/clipboard-packaged.test.ts test/app/session-shell/herdr-image-files.test.ts test/app/session-shell/paste-executor.test.ts test/app/session-shell/paste-chip-lifecycle.test.ts test/app/session-shell/prompt-chips.test.ts test/app/session-shell/session-shell-paste.test.ts --reporter=dot --silent --maxWorkers=1 --no-file-parallelism
```

Composition boundary run: **19 tests passed**; the added case proves settings copy loads the mocked native writer only on request, preserves its exact payload, and rejects oversized admission without another write:

```bash
cd /d/Git/a1/.worktrees/herdr-image-paste && npx vitest run test/composition/session-runtime-wiring.test.ts --reporter=dot --silent --maxWorkers=1 --no-file-parallelism
```

These are **284 distinct passing tests**, not a sum of overlapping earlier runs. Earlier successful checkpoints were 110 tests for Outcome 1 and 181 for Outcome 2. No directory-wide suites, preflight, fast/full/release suites, or real desktop clipboard operations were run.

Coverage includes policy matrices; overridden/missing emulator identity; known-remote denial and explicit-port precedence; real selected-source native screenshot acquisition; exact image bytes on submission; captured copy-before-paste ordering; exact supplied Unicode/multiline/large text with no clipboard read; source/emitted image-only read traces; quoted/spaced/uppercase-extension file paths; zero native operations for transferred images; invalid/MIME/oversize/pixel failures; vanished files and sanitized diagnostics; cancellation/exit fences; rapid image ordering and later typing; history image rehydration and undo; existing path lists and ordinary paste/lifecycle controls; and emitted package helper/worker inventory.

## Failures investigated during implementation

- Initial raw-shell tests sent the control key and later typing as one synthetic input event. The keyboard matcher did not interpret that as distinct input. Sending the real key event followed by a typing event restored the intended structural assertions; no production shortcut behavior was weakened.
- The new invalid-file test initially expected `image-data`; the reused decoder's established unsupported-content result is `image-conversion`. The exact expectation was corrected; invalid bytes still cannot become attachments.
- Architecture checks caught an unused exported destination predicate after decoupling and an exceeded eager-source budget. Moving the unchanged copy predicate to a consumed policy module and lazily loading optional native writers fixed those findings without widening the budget.
- A combined 13-file parallel run reported 276 passes and 8 failures: process-heavy composition cases hit existing five-second deadlines/Windows cleanup locks, and image cases exceeded existing short readiness waits under concurrent cold-helper load. The exact composition file passed alone, and all 12 clipboard files passed with one worker. Existing timing assertions and deadlines were not increased or removed. The cold-helper wrappers continue bypassing source pools as intended while carrying image-only intent.

## CI repair after the first finalized candidate

The first finalized candidate failed changed-file documentation validation for three uncategorized implementation comments. The comments now use the required `Security:` or `Rationale:` categories; no policy or behavior was changed to bypass the check.

The macOS image-compatibility lane also exposed a stale isolated package fixture: `image-worker.ts` now imports `image-file-preparation.js`, but the fixture copied only the previous worker dependency list. Its positive conversion case therefore returned `image-codec` before loading the codec. This failure was reproduced locally before repair. The fixture now includes the new dependency and exercises both clipboard-byte and file-based conversion in its dependency-isolated process, still without tsx/Pi and still enforcing successful resizing, output bounds, and recoverable missing-WASM behavior.

The repair passed build, typecheck, changed-file documentation validation, and 68 tests across the four exact affected/image-compatibility files on Windows. The original macOS failure is not claimed as verified on macOS locally; fresh exact-head CI owns that evidence. No deadlines, assertions, required checks, readiness state, acceptance text, or implementation ticks were weakened or reset.

```bash
cd /d/Git/a1/.worktrees/herdr-image-paste && npx vitest run test/app/session-shell/clipboard-paste-policy.test.ts test/app/session-shell/herdr-image-files.test.ts test/app/session-shell/image-worker-package.test.ts test/app/session-shell/image-preparation.test.ts --reporter=dot --silent --maxWorkers=1 --no-file-parallelism
```

## Known limitations and disposition

1. **Ambiguous markerless remote raw key:** the source protocol cannot prove viewer locality. Raw Herdr image-only host access is a deliberate compatibility exception, discussed before the user's implementation request. If a remote viewer forwards only a raw key rather than supplied content, an unrelated host image may be read successfully. Retry feedback cannot recognize that success as the wrong image. Supplied remote text/images never use this exception. This implementation does not claim the initial absolute unknown-attachment no-read guarantee.
2. **Physical acceptance unperformed:** the exact candidate must still be tried in local Herdr, remote Herdr, and a native terminal, including bidirectional selection-autocopy/explicit-copy text flows. Record A1 candidate/build and installed Herdr versions, endpoint OSes, and GUI/CLI attachment. Installed `hc` reported `0.1.19` during investigation; installed GUI and running-core versions were not established. No installed/running A1 binary was replaced or assumed to match the checkout.
3. **Bounded file scope:** exactly one existing supported image file becomes an attachment. Multiple/mixed file lists and missing paths retain the established path/text behavior. This is not a general multi-file importer or a change to Herdr transfer limits/staging cleanup.

## Interactive candidate

The candidate checkout is built. Use the documented development launcher in a local or remote Herdr terminal; this starts the checkout rather than relying on an already running installed agent. Copy a harmless screenshot outside A1, paste it, verify one usable image attachment, and check text copying in both machine directions. Physical results remain unclaimed until actually observed.

```bash
cd /d/Git/a1/.worktrees/herdr-image-paste && ./scripts/dev
```

No merge, auto-merge, unrelated cleanup, Herdr code change, new setting, dependency patch, or comparison-profile policy change is authorized or performed. Keep the task attached for follow-up fixes; trusted automation owns readiness/finalization.
