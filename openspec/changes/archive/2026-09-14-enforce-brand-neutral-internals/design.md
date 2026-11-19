## Context

See `proposal.md` for motivation and the approved breaking-cutover scope. This revision replaces the earlier compatibility design: the maintainer is the sole current user and explicitly does not require migration or support for pre-cutover runtimes.

The source reviewed at `9f48ef9b` still has three relevant constraints:

- The identifier checker misses lowercase embedded names, private identifiers, and quoted members, and incorrectly treats arbitrary uppercase `A1_*` properties as external settings.
- The product identity registry mixes public settings with private coordination and tooling entries. Its validator requires every environment value to use the product prefix, so private definitions must be separated before neutral values can load successfully.
- The updater and launcher can execute retained release code. The earlier dual-write proposal was shown to leave stale neutral keys when an older updater refreshed only branded keys. This design removes that interoperability requirement rather than adding another compatibility layer.

The original implementation attempt made no source changes and completed no tasks. The revised plan must be integrated before implementation resumes.

## Goals / Non-Goals

**Goals:**

- One dependency-light, brand-neutral private environment contract for all newly built components.
- Required PR checks for internal names and private environment keys, without changing supported external branding or configuration.
- A deliberate clean installation boundary, with runtime eligibility checks and explicit protection of user data.
- Reliable launch, update, rollback, recovery, and session continuity among releases that use the new contract.

**Non-Goals:**

- Legacy private aliases, dual reads/writes, old/new encoders, target-version negotiation, compatibility adapters, migration helpers, or an alias-retirement program.
- Running a pre-cutover updater, retained runtime, rollback target, or recovery capsule under the new implementation.
- Renaming the public executable/package, moving `.a1` or platform user-data directories, changing user-data or external protocol formats, or deleting user data.
- Rewriting historical evidence or immutable old releases, introducing a general environment sandbox, or changing the independently planned prompt-history storage location.

## Decisions

### 1. Separate internal names from supported external values

Use a case-insensitive substring match for `a1` on decoded owned names. The parser determines whether a token is a binding, parameter, declaration, reference, alias, or member name. Private names and quoted or statically known computed members remain names; comments, ordinary strings, regexes, numeric literals, and embedded source snippets used only as test data do not become declarations.

This deterministic rule also matches an owned identifier such as `sha1Digest`; use a role name such as `contentDigest` while preserving the external algorithm value `"sha1"`. Do not infer intent from a growing list of prefix exceptions.

Supported public environment keys, serialized external fields, and third-party import spellings remain exact boundary data, translated to neutral local names where needed. They never authorize similarly branded internal state. There is no exception category for active legacy private aliases. Historical records and negative-test inputs may describe obsolete names without making them supported settings.

**Alternative rejected:** raw grep or blanket `A1_*` property exemptions. Neither distinguishes executable names from external data or source snippets reliably.

### 2. Keep explicit public/private ownership, without compatibility metadata

Keep the public product identity authority separate from lightweight private runtime/test/automation definitions. Inventory each owned key's logical role, single supported spelling, owner, producers/consumers, exposure evidence, and value semantics. Do not create alias maps, compatibility owners, retirement dates, or version matrices.

Initial dispositions:

| Surface | Disposition |
| --- | --- |
| `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, `A1_DATABASE_PATH`, `A1_ENDPOINT` | Preserve documented public spellings and path behavior; use neutral code names. |
| Release root/id/digest/layers, launch profile, warmup flag | Replace with the single neutral private contract below. |
| Cleanup-worker, internal native probe, CI, and test-worker settings | Replace confirmed private spellings with descriptive neutral keys and update all current producers/consumers together. |
| Profile-home, startup diagnostics, and development overrides | Record exact existing exposure-review entries; preserve caller-facing spellings until the review establishes the supported boundary. |
| Native pane/session environment exported to child programs | Review as an external integration rather than assuming it is private because it is absent from the UI. |
| Protocol markers and apparently unused registry entries | Classify by actual use; preserve supported external protocols and remove proven-unused definitions rather than generating replacements. |

Pending exposure review is allowed only for exact existing keys and cannot be used to keep a confirmed private spelling. New unclassified keys fail governance. A public/integration interface is not renamed under the guise of removing legacy support.

**Alternative rejected:** replace every branded environment value indiscriminately. That would break user configuration, while retaining obsolete values as aliases would contradict the approved clean cutover.

### 3. Use one private launch-context reader and writer

Represent launch context as neutral logical fields. The shared reader/writer owns only the current spellings, value checks, required-field rules for each private entry, and platform casing behavior. All consumers, including warmup and immutable-root verification, use this contract rather than direct branded lookups.

| Logical role | Only supported private key |
| --- | --- |
| Release root | `LAUNCH_CONTEXT_RELEASE_ROOT` |
| Release identity | `LAUNCH_CONTEXT_RELEASE_ID` |
| Content digest | `LAUNCH_CONTEXT_RELEASE_DIGEST` |
| Dependency layers | `LAUNCH_CONTEXT_RELEASE_LAYERS` |
| Launch profile | `LAUNCH_CONTEXT_PROFILE` |
| Warmup permission flag | `LAUNCH_CONTEXT_WARMUP` |

An owning parent reconstructs outgoing private context from its verified target and current intent, replacing stale values for the current contract. Unrelated public and third-party settings stay intact. Receivers validate the required coherent fields without defaulting a missing verified-release field to an arbitrary installation or user path. Conflicting duplicate private keys on Windows fail with a bounded logical-setting diagnostic, not an environment dump.

Obsolete branded private inputs are never interpreted as replacements for missing current fields. If a private entry receives only obsolete keys, its ordinary current-contract validation fails. If valid current context and obsolete ambient variables coexist, the obsolete variables have no authority over release, profile, or path selection. No legacy lookup table or fallback reader is needed.

Keep contract data and helpers small enough for early startup imports. CI parsers and repository traversal must not enter this graph. Preserve immutable-root, digest, ownership, containment, and performance checks.

**Alternative rejected:** the previous dual-write design or target-aware legacy serialization. Both support an interoperability requirement the maintainer has now removed.

### 4. Enforce an explicit clean-cutover boundary

Stop pre-cutover application, supervisor, and worker processes before the one-time installation. Install the selected new package directly through npm; do not promise that the old `a1 update` command or an old recovery launcher can perform this first cutover.

Use one exact supported private-contract identity in verified release metadata to validate runtime eligibility. This is an equality check, not version negotiation: a missing or different identity makes a target ineligible. Check eligibility before warming or executing a selected target, committing its activation, or selecting it for retained launch, rollback, or recovery. Do not try an older encoding, rewrite an old payload, or infer eligibility from package-version ordering alone. Ordinary launch may prepare the newly installed package, but stale active references must not cause a pre-cutover runtime to be executed.

If unsupported retained/recovery state prevents a safe selection, stop with an actionable cutover diagnostic. Do not silently adopt that state or erase it. The installation handoff must list the exact resolved disposable runtime/release paths, their owners, and why any reset is needed. A reset is a manual action requiring separate confirmation after all affected processes stop; this specification does not authorize deleting anything.

Never delete an entire configuration/data root simply because disposable release records also live there. Protect settings, credentials, profile sessions, prompt history, and `.a1` user data. No format conversion or user-data relocation is part of the cutover. Private release metadata can express current eligibility without migrating old records.

After cutover, different package versions using the same private contract remain supported: updates preserve their ongoing sessions, retained launch uses eligible releases, and rollback/recovery retain their existing safety rules. If no eligible rollback target exists, report that limitation rather than executing a pre-cutover target.

**Alternative rejected:** silently fall back to old active/recovery state or delete all state automatically. The first restores unsupported legacy execution; the second risks losing user data.

### 5. Strengthen the existing syntax-aware PR gate

Extend the current TypeScript-based inspector for `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs`, including declaration files. Cover private identifiers, aliases, binding patterns, parameters, type members, accessors, and literal/constant-computed member names. Resolve straightforward constant environment-key references and validate registry uses against exact external/private ownership.

Use token-aware Rust inspection with fixtures for raw strings, characters, lifetimes, nested comments, raw identifiers, and relevant macro tokens. Unsupported owned input is a validation failure, not a clean result. Inspect owned JSON environment definitions, workflow maps, and supported shell assignments as well. Dynamically composed owned environment keys must go through the declared contract rather than bypass policy.

Enumerate tracked first-party inputs, including tests and locally adapted source ports. Explicitly exclude dependencies, immutable vendor content, generated output, and other worktrees. Do not exempt an entire first-party subtree merely because its name contains `upstream`.

Reuse the existing impact selection and required aggregate. Changed mode reads complete head files selected from the authoritative merge-base-to-head diff, including additions, modifications, copies, relevant type changes, and rename destinations. Deletions and rename sources participate in ownership/invalidation decisions but are not read as missing head files. Missing refs, unavailable diffs, unreadable files, and inspection failures cannot become empty success.

Policy, classification, exception, ownership, parser dependency, and check-integration changes trigger a full tracked audit plus checker regressions. Full validation retains the complete audit; ordinary changed-mode PRs should not repeat it through a second architecture/inventory invocation. Keep all other architecture gates.

The required aggregate checks the applicable naming result for the exact current head and rejects stale, failed, missing, or unexpectedly skipped results. Evidence includes base/head, mode, paths, exclusions, escalation reasons, findings, and timing. Non-policy documentation-only changes remain product-build/test-free. A PR cannot add a private legacy-key exemption to make a violation disappear.

**Alternative rejected:** changed-line-only inspection or an informational check outside the required aggregate. Both weaken the promised merge protection.

### 6. Test the current contract, rejection behavior, and user-data safety

Keep parser and PR-selection regressions, including private/quoted names, false positives in test snippets, exact public-boundary allowances, rename/copy cases, missing refs, malformed input, stale-head evidence, and required-result failures.

Replace successful old/new interoperability fixtures with negative tests: obsolete-only input does not satisfy private startup, unsupported target identity prevents execution, and an attempted legacy exception fails governance. No preserved old executable or old updater implementation is required for these tests.

Exercise installed launch, `a1 pi`, warmup, update activation, retained-session continuity, rollback, and interrupted-update recovery between different releases sharing the new contract. Keep public-setting, platform-path, stored user-data, immutable-verification, and existing budget assertions. Verify documented reset boundaries using disposable fixtures containing protected settings/session/history sentinels; never test reset by deleting actual user data.

## Risks / Trade-offs

- **The first upgrade is intentionally incompatible** -> Stop old processes, install directly with npm, and provide precise cutover instructions instead of migration code.
- **Old retained metadata is still present** -> Validate one supported contract before execution/activation and fail clearly when stale state blocks progress.
- **A reset targets a directory that mixes disposable and user data** -> Enumerate exact disposable paths and protected sentinels; require separate manual confirmation and never blanket-delete a data root.
- **Undocumented settings are externally used** -> Exact exposure review remains; confirmed private keys cannot claim that exception.
- **Checker exceptions expand** -> No private legacy exception category, exact external boundaries, and full audits on policy changes.
- **New helpers expand startup work** -> Dependency-light contract helpers and unchanged startup budgets.
- **Concurrent launcher/history work touches the same paths** -> Base implementation on accepted changes without combining their redesigns with this naming change.

## Cutover and Rollback Plan

1. Inventory exposure and protected data; freeze public-setting/path expectations and define exact current-contract eligibility.
2. Strengthen PR governance, refactor real internal-name violations, and separate public identity validation from private definitions.
3. Replace every confirmed private producer/consumer in the current build with the neutral contract. Add no aliases, migration helpers, or legacy execution routes.
4. Validate current-contract runtime behavior and rejection of obsolete inputs/targets in CI, including protected-data fixtures and existing budgets.
5. Provide the maintainer a direct-install command for the accepted build and the stop-process prerequisite. If reset is required, enumerate disposable paths and request separate confirmation; do not delete user data.
6. Perform the clean cutover. Subsequent supported updates and rollbacks use only releases sharing the new private contract. Returning to a pre-cutover installation is another deliberate manual installation/reset, not an in-app compatibility path.

No unresolved design question permits legacy support to be added later without a separately approved specification change.
