## Context

See `proposal.md` for motivation and scope. The three delta specifications define the acceptance contract.

The planning base is `origin/develop` at `0c4b2e71`. Relevant source observations from the investigation remain applicable at this base:

- `scripts/governance/product-identifier-policy.mjs` inspects TypeScript identifier nodes and sanitized Rust text. Its current pattern misses lowercase embedded forms; it does not inspect TypeScript private identifiers or string-named members. Arbitrary uppercase `A1_*` property accesses, assignments, and signatures are classified as external without checking an actual contract.
- `src/product-identity.json` groups 35 entries under `environment`, mixing public overrides, private coordination, developer/test controls, and some protocol markers or apparently unused entries. Other private keys live outside this registry, including cleanup-worker and CI settings.
- `src/product-identity.ts` validates every entry against the command-derived environment prefix during module initialization. An in-memory change of the release-root value to `APP_RELEASE_ROOT` was rejected by the existing validator; editing values alone would prevent normal imports.
- `src/foundation/release/update.ts` uses the running updater's implementation to warm and start an installed candidate, and can start an older release during rollback. `bootstrap.ts` also launches retained targets. `bin/guardian.js` and `bin/ui.js` contain direct environment reads. Old and new processes therefore need not ship together.
- The warmup guard in `src/foundation/startup/startup-runtime.ts` rejects an absent private flag. In-memory probes of the existing guard with mismatched legacy/canonical keys rejected both transition directions. These probes establish a naming-contract risk, not completed runtime or package acceptance.
- Existing CI already invokes the identifier checker through architecture validation. Changed-file impact selection and a head-bound required aggregate also exist and should be extended rather than replaced.

The existing product-identity specification currently describes all registered environment variables as product-namespaced. This change narrows that rule to supported public/external settings and explicitly classified compatibility data; its delta must land before implementation applies a different rule.

## Goals / Non-Goals

**Goals:**

- Make the policy executable at the PR boundary, including private members and string-valued private environment keys.
- Keep logical configuration names neutral while distinguishing stable external addresses from owned implementation details.
- Make private-key migration safe when producer and consumer belong to different supported releases.
- Keep governance dependencies out of runtime startup and avoid redundant complete scans on ordinary PRs.

**Non-Goals:**

- Erase every `A1` string, replace branding in comments or UI text, rename third-party APIs, or rewrite immutable vendor sources.
- Rename the public executable/package, move `.a1` or platform state directories, or change stored schema/field spellings. In particular, do not combine this work with the independently planned prompt-history relocation.
- Introduce a general-purpose environment sandbox, a new launcher architecture, or a new support cutoff for old releases.
- Treat registry edits, baseline regeneration, or same-source fixtures carrying old version labels as compatibility proof.

## Decisions

### 1. Separate the two policies: internal names and external values

Use a case-insensitive substring match for `a1` on decoded owned identifier names. This deliberately covers lowercase embedded forms, not just a camel-case prefix. The language parser determines whether a token is a declaration, reference, binding, or member name; comments, ordinary strings, regexes, numeric literals, and embedded test-source strings are not themselves declarations. Quoted or constant-computed member names still carry an owned name and are checked. A branded local alias is forbidden even if its import/export spelling comes from an external interface.

External spellings are a distinct concern. A serialized field, imported external symbol, public environment key, or legacy wire key may retain its spelling only at a classified boundary. Where possible, translate it to neutral local names immediately. A string value is not a license to introduce an internal declaration with the same branded name.

This is a literal name rule, so an owned identifier such as `sha1Digest` also matches; use a role name such as `legacyDigest`, while preserving an external algorithm value such as `"sha1"`. Do not add broad algorithm, file, or prefix exceptions to guess whether branding was intended.

**Alternative rejected:** raw repository grep. It both misidentifies source snippets and misses the distinction between a neutral constant containing a private environment key and a branded constant containing public data.

### 2. Maintain an explicit environment-contract inventory

Keep the public identity authority small and validated. Define private runtime/test/automation contracts separately, using neutral logical names and descriptive canonical keys. Reuse lightweight data definitions across entry points and consumers; governance metadata must not pull a parser, repository traversal, or release-management graph into an early startup import.

The implementation inventory records logical role, exact canonical spelling, producer/consumer locations, exposure category and evidence, supported value semantics, legacy aliases, owning compatibility boundary, and alias-removal conditions. It includes definitions outside the current JSON registry and distinguishes stdout protocol markers from actual environment keys. Apparently unused entries need evidence before removal; do not manufacture replacements for obsolete settings.

Initial dispositions are:

| Surface | Disposition |
| --- | --- |
| `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, `A1_DATABASE_PATH`, `A1_ENDPOINT` | Preserve documented external names and current path behavior; consume through neutral names. |
| Release root/id/digest/layers, launch profile, immutable warmup | Private cross-release context; migrate with the compatibility boundary described below. |
| Cleanup-worker holds/run id and explicitly internal CI/test worker keys | Private coordination; migrate complete chains, checking whether a retained recovery/worker can outlive its producer. |
| `A1_PROFILE_HOME`, `A1_STARTUP_TRACE`, development overrides and diagnostics controls | Trace callable interfaces and retain existing spellings while exposure is being resolved; do not equate undocumented with private. |
| `A1_PANE_ID`, `A1_TERMINAL_SESSION_ID` | External-integration review: the native host injects them into child programs; preserve pending a supported-consumer determination. |
| Probe output markers, obsolete certification/native-profile entries | Classify by actual use, preserving existing protocols or removing proven-unused definitions deliberately. |

Every pending-review item is an exact existing key with evidence and an owner. New unclassified keys and wildcard exemptions fail governance. Established public/integration interfaces stay unchanged in this change. If an exposure review would require changing a supported external setting, that is a separate compatibility decision, not implementation discretion.

**Alternative rejected:** change all private-looking strings to `APP_*` inside `product-identity.json`. The validator currently forbids that, it conflates branding with process coordination, and generic ambient names create avoidable collision risk.

### 3. Normalize private launch context at a small compatibility boundary

Represent launch context internally as neutral logical fields. A single reader/writer boundary owns canonical spellings, legacy aliases, normalization, value checks, and platform name-casing rules. All private-context consumers, including root verification and warmup, must use the same normalized result; leaving one direct legacy lookup behind would defeat the migration.

Use the following canonical family for the confirmed cross-release settings:

| Logical role | Canonical key | Legacy alias |
| --- | --- | --- |
| Release root | `LAUNCH_CONTEXT_RELEASE_ROOT` | `A1_RELEASE_ROOT` |
| Release identity | `LAUNCH_CONTEXT_RELEASE_ID` | `A1_RELEASE_ID` |
| Content digest | `LAUNCH_CONTEXT_RELEASE_DIGEST` | `A1_RELEASE_DIGEST` |
| Dependency layers | `LAUNCH_CONTEXT_RELEASE_LAYERS` | `A1_RELEASE_LAYERS` |
| Launch profile | `LAUNCH_CONTEXT_PROFILE` | `A1_LAUNCH_PROFILE` |
| Warmup permission flag | `LAUNCH_CONTEXT_WARMUP` | `A1_IMMUTABLE_WARMUP` |

The initial transition uses coherent dual-write at owned cross-release launch boundaries and dual-read at new receivers. This avoids requiring already shipped updaters to discover a new capability or modify an older release. Both spellings are emitted from one validated selected context, never from independently copied values. Same-version-only worker contracts do not need aliases unless inventory evidence establishes a cross-version lifetime.

Reader rules:

- Canonical-only and approved legacy-only representations receive identical validation.
- If both representations are present, they must be equivalent under the setting's existing semantics. Do not invent more permissive release/path validation for an alias.
- Conflicts fail with the logical key identified, without dumping environment contents. A conflict cannot trigger a default-root fallback or choose a different release.
- Required values are checked as a coherent context; do not assemble a usable-looking release from incompatible partial groups.
- On Windows, normalize private key casing and reject conflicting duplicates; preserve platform behavior for unrelated environment values.

Writer rules:

- A parent that owns a verified target selection reconstructs the complete owned outgoing context from that target and the current launch intent. It removes stale canonical/alias values for this owned context before emitting both forms.
- Public overrides, third-party variables, and classified integration variables remain unchanged. Generic forwarding is not permission to use ambient private values as verification evidence.
- Keep private context scoped to owned process handoffs; audit propagation to unrelated commands so a nested older launcher is not accidentally given stale canonical metadata it cannot refresh. Any focused filtering removes only inventoried private coordination keys, not user or integration settings.

Legacy private spellings remain literal data only in the compatibility definition and explicitly declared legacy tests. The transition does not make their removal a prerequisite for acceptance. Removal requires a later reviewed proof that supported updaters, retained targets, and recovery capsules no longer need them; do not impose a new version cutoff during this work.

**Alternatives rejected:** hard cutover, silent canonical-over-legacy precedence, and modifying retained release files. Respectively, these break old callers, hide wrong-release ambiguity, or violate immutable release verification.

### 4. Reuse language-aware governance and explicit source ownership

Extend the current TypeScript compiler-based inspector for `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs`, including declaration files. Inspect private identifiers, parameters, aliases, destructuring, type members, getters/setters, and literal/constant-computed member names. Resolve straightforward constant environment-key references, and check registry references against declared contracts. Do not infer that an arbitrary uppercase property is public.

For Rust, use a token-aware inspection path that preserves identifiers while correctly handling raw strings, character literals, lifetimes, nested comments, raw identifiers, and relevant macro tokens. Add syntax fixtures rather than extending the existing comment/string stripping regex without proof. Inability to inspect a selected owned file is a failure, not a clean result.

Environment-contract checks additionally inspect owned JSON definitions, workflow environment maps, and supported shell environment assignments. Unknown literal branded environment keys fail classification. Generic user-environment forwarding is distinguished from owned key definition; dynamically composed owned keys must be resolved through the classified boundary rather than used to evade the check. Classification data is reviewed and validated; it is not an allowlist of arbitrary lines.

Enumerate authoritative tracked files, not every file on disk. Include owned code and adapted source ports; exclude immutable vendor content through established provenance/ownership rules. Exclude build output, dependencies, and other worktrees. Do not modify third-party code merely to satisfy an internal naming policy.

**Alternative rejected:** a blanket exemption for tests, native source, or every file under an upstream-named directory. Local adaptations and new test helpers are still owned code.

### 5. Add an explicit changed-file mode to existing validation

Extend `scripts/governance/product-identifier-policy.mjs` and the existing validation selection/evidence types instead of creating a competing check. Naming selection uses the authoritative PR base/head and complete NUL-delimited Git name-status data, including rename/copy origins and destinations. The existing selector's best-effort local base fallback must not turn an unavailable PR base into an empty successful naming selection.

Ordinary PR mode inspects full head files for added, modified, copied, renamed-to, and relevant type-changed inputs. Deletions and renamed-from paths remain selection inputs but are not read as head files. Track scope changes across both paths, with no evasion through extension/root renames. Unknown owned-source inputs or parse failures produce an actionable failure.

Policy, exception/registry, source ownership, relevant parser dependency, and check-selection/integration changes escalate to the complete tracked audit plus checker regressions. Full validation continues to support the complete audit. Refactor the existing architecture invocation/inventory test ownership so ordinary PRs do not accidentally perform the same complete identifier scan again; do not drop other architecture gates or historical inventory evidence.

Bind the result to the existing required aggregate, whether execution remains in architecture validation or is split into a lightweight naming job. The aggregate requires the exact selected head and treats absent, stale, failed, or unexpectedly skipped results as failures. Evidence includes selection mode, inspected paths, explicit exclusions, escalation reasons, diagnostics, and timing. Documentation-only changes outside policy inputs remain product-build/test-free.

**Alternative rejected:** inspect only changed lines or run an informational job that does not affect the required aggregate. Both allow a PR to merge without the promised protection.

### 6. Acceptance must exercise actual old/new contracts

Checker tests cover detection and allowed boundary cases, malformed input, source ownership, all diff statuses, unusual path characters, missing refs, stale-head evidence, and aggregate skip/failure behavior. Environment tests cover classification, registry uniqueness, stale inherited values, case conflicts, and canonical/legacy-only and conflicting inputs.

Cross-version tests preserve small, independently traceable pre-transition producers and consumers rather than compiling the current implementation twice with different version strings. Include packaged activation with an old-contract updater, new caller to a retained old-contract target, rollback, ongoing sessions, cancelled replacement/recovery, and nested launch behavior. Keep existing immutable verification, public settings, path resolution, and performance assertions. A dummy warmup child that only exits zero does not establish compatibility.

Runtime acceptance covers Windows, Linux, and macOS through the existing applicable CI scopes. The implementation handoff separately records physical launch/session/update acceptance; a passing naming check is not proof of runtime safety.

## Risks / Trade-offs

- **Mixed-version processes remain common** -> Keep bidirectional aliases at the narrow boundary and test both directions, including retained recovery artifacts.
- **Conflicting or inherited metadata selects the wrong release** -> Rebuild owned outgoing context, reject receiver conflicts, and retain immutable-root/digest/ownership checks.
- **New canonical metadata leaks to an older nested caller** -> Audit private-key forwarding and test nested process chains; keep public/integration settings intact.
- **Overbroad exceptions recreate today's checker hole** -> Exact contracts and boundary contexts, no prefix-wide or whole-file exemption, full audit on policy changes.
- **An undocumented setting is actually relied on** -> Preserve exact existing spelling pending evidence; scope changes to established private contracts.
- **Literal substring matching catches non-brand names** -> Document the deterministic rule and use role-neutral owned names; preserve legitimate external values and interface spellings at their boundaries.
- **Rust or workflow syntax is incompletely analyzed** -> Explicit supported syntax and negative fixtures; fail closed on unsupported owned input.
- **A new shared module expands startup work** -> Keep runtime definitions dependency-light; no CI parser dependencies in runtime and no relaxed startup budgets.
- **Concurrent launcher/history changes touch these paths** -> Rebase implementation on their accepted state, preserve their external contracts, and do not redesign them inside this naming change.

## Migration Plan

1. Establish the complete environment and identifier inventory, including exact exposure-review entries and legacy producer/consumer fixtures. Freeze public-setting and persistent-format expectations.
2. Strengthen checker semantics and add the changed-file/required-result integration. Refactor real internal-name violations; do not rewrite ordinary branded text or allowlist violations as a baseline refresh.
3. Separate public identity validation from private contracts while keeping external spellings stable. Add the compatibility reader/writer and conflict tests before any cross-release canonical spelling changes.
4. Migrate owned launch, warmup, supervision, guardian/UI, verification, and recovery handoffs together. Migrate proven same-version test/tool/worker keys with their full consumer chains. Retain explicit aliases and unresolved external spellings as specified.
5. Run required CI and cross-version acceptance, preserving budgets and immutable validation. Ship only when old-to-new and new-to-old paths work; retain the older launch contract if the transition cannot yet satisfy those gates.
6. Rollback remains the existing verified-release rollback using the preserved legacy contract, not a user-data migration. Alias removal is a later compatibility change with its own evidence, not an automatic cleanup step.

Exact implementation filenames for lightweight contract data and individual checker fixtures can be chosen without changing this design. No unresolved design question authorizes changing a public setting, support boundary, or persistent format.
