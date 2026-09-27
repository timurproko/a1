## Context

Run `36331807992` selected merged source `f83c501794763b2f3ab2b2235fd4baac10dcdd01` and candidate `0.2.1-dev.600`. Attempt 1 stopped at installer publication because the installer trusted publisher was not yet configured. After configuration, attempt 2 published both packages through GitHub OIDC, verified their exact registry bytes, and advanced both `next` tags.

All three `post_publish` matrix jobs then failed during runner setup. Their sole checkout reference was `actions/checkout@de0fac2e4500dabe0009ef9f129fbe2d3a1f872d`; GitHub and the upstream repository report that commit does not exist. Every other repository workflow checkout uses the established immutable v5 commit `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09`.

An isolated Windows run of `smoke-published-installer.mjs` against the exact `.600` registry integrities reached the installer but failed with `activation returned an invalid event`. Direct activation emitted 7,173 valid newline-delimited JSON events. The installer's process runner currently truncates `pending + chunk` to the final 8,000 characters before splitting lines. When one chunk contains more than 8,000 characters of complete events, truncation begins inside a JSON line and sends the corrupt suffix to the activation parser.

## Goals / Non-Goals

**Goals:**

- Make every published-pair job use a resolvable immutable checkout reference consistent with the rest of the release workflow.
- Preserve every complete line in a large child-process chunk before applying a bound to the unresolved trailing fragment.
- Keep retained diagnostics and unterminated child output bounded.
- Prove a new OIDC-published candidate installs and launches through the isolated Windows, Linux, and macOS published-pair lanes.

**Non-Goals:**

- No mutation or republish of `.600`.
- No weakening of activation event validation or acceptance of malformed JSON/events.
- No unbounded subprocess output buffers.
- No change to the activation protocol, npm trusted-publisher identity, release triggers, validation matrices, or stable mutation guards.

## Decisions

### 1. Reuse the established checkout pin

Replace the nonexistent post-publication checkout commit with the same immutable v5 commit already used by every other checkout in `release.yml`. Add focused policy coverage requiring release-workflow checkout references to remain consistent, so a one-off typo cannot survive while still satisfying the generic forty-hex pin policy.

Using an unpinned tag is rejected because repository policy requires immutable action commits. Introducing the current v6 tag only in this job is rejected because it recreates unnecessary release-lane drift; a repository-wide upgrade belongs in a separate deliberate change.

### 2. Separate line framing from diagnostic retention

Build the candidate line-framing buffer from the prior incomplete fragment and current chunk without truncating complete lines. Split and deliver all newline-terminated lines first. Apply the existing fixed bound only to the unresolved trailing fragment returned for the next chunk. Continue bounding retained stdout and stderr diagnostic text independently as today.

This preserves valid high-volume activation transcripts while keeping a child that emits one indefinitely unterminated line bounded. If such a line exceeds the bound, only its suffix remains and strict JSON/event validation fails closed; the installer does not reinterpret malformed output as success.

### 3. Test the incident shape directly

Expose or isolate the small line-framing helper for a deterministic unit regression. Feed it a single chunk larger than the diagnostic limit containing many complete JSON event lines plus a partial final line, verify every complete line is delivered intact and the partial line is reassembled, and verify an oversized unterminated line remains bounded.

Retain orchestration tests for strict unknown-event rejection. Extend release policy coverage to require the post-publish checkout to share the workflow's established pin.

### 4. Require a new full development publication

`.600` proves OIDC publication and registry integrity for both packages but not native installation completion. Its failed aggregate remains failed. After the corrective PR merges, `npm run develop` must create the newly numbered candidate and pass package validation, both OIDC publications, registry verification, all three native published-pair jobs, completion, and the aggregate. A local Windows smoke is focused diagnosis, not a substitute for the native matrix.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Stream framing | One chunk beyond 8 KiB delivers all complete activation lines intact and reassembles its partial tail |
| Bounded failure | A single oversized unterminated line remains bounded and cannot become accepted activation evidence |
| Workflow policy | Every `release.yml` checkout uses the established resolvable immutable pin |
| Installer orchestration | Existing strict activation and silent-transcript tests remain passing |
| PR | Exact-head selected CI validates code, workflow, governance, and OpenSpec delivery |
| Post-merge | New candidate publishes through OIDC and passes Windows, Linux, and macOS published-pair installation smoke plus completion/aggregate |

## Risks / Trade-offs

- **Processing all complete lines can schedule many callbacks.** Activation already emits one event per materialized file; preserving those events is required for correctness, and each is processed through the existing serialized relay.
- **A giant unterminated line is intentionally truncated.** This preserves the memory bound and causes strict activation failure rather than accepting ambiguous output.
- **Reusing checkout v5 defers v6.** Consistency and a known valid commit are preferable for this correction; a coordinated upgrade can be reviewed separately.
- **Another numbered preview is required.** This is the only way to prove corrected package bytes and workflow configuration together without mutating `.600`.

## Migration Plan

1. After explicit plan approval and implementation request, continue in this worktree, branch, and draft PR.
2. Add focused regressions, repair line framing, and replace the invalid action pin.
3. Complete implementation evidence, acceptance scenarios, finalization, and exact-head PR validation before authorized manual merge.
4. After merge, run one new development publication and require all native published-pair lanes and the aggregate to pass.

Rollback uses a later corrective PR and never removes or rewrites published package versions.
