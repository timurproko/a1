## Context

The user supplied `C:/Users/tprokopiev/Desktop/a1-unified-pi-launch-plan.md` as a planning handoff. This tracked proposal preserves its scope and exclusions; it does not treat the Desktop document as implementation authorization.

Planning baseline is freshly fetched `origin/develop`, `2d5c3646` (`fix(api): unify normal and compatible runtime integrations (#927)`). GitHub reports #927 merged, with reviewed head `cd079581e906b37073d46b080a69a50bb96fe51e`. This separate task therefore starts with its normal-product lifecycle already integrated. Do not edit that delivery's archive or redesign its ownership fences.

### Current source findings

- `bin/cli.js` calls `dispatchCli`; `src/cli/dispatch.ts` only recognizes `--session`, `--session-dir`, `--session-color` and `--` as leading interactive tokens. Leading `-e` or `--model` reaches its intentional quiet fallback. Unknown leading launch flags are also currently silent.
- `src/cli/pi-compatible.ts` owns broader option collection, relative extension/session-storage path normalization, duplicate singleton checks and positional instruction parsing. It builds a normal `a1` intent, not the comparison profile.
- `src/features/launch/interactive-arguments.ts` parses owned session/color/literal child arguments and accepts serialized `--runtime-options`. `interactiveLaunchIntent` round-trips through this parser and the neutral startup serializer to validate its immutable intent. Public ordinary routing currently also reaches this parser: sharing it unmodified would retain a public/internal payload boundary problem.
- `src/foundation/launch-context/runtime-options.ts` validates bounded structured values; `interactiveStartupArguments` serializes them into literal child argv. This is transport, not public Pi grammar or engine policy.
- `bin/pi-compatible.js` owns the catalog's Firstmate pre-factory refusal and normal-profile preparation, then calls the existing engine `listPiCompatibleModels`. Ordinary `bin/cli.js` has no catalog handler yet.
- `scripts/development/start-local.mjs` parses normal and compatible requests, selects the direct UI for interactive intents and transports structured options. `scripts/dev` is the supported shell entry. Production entries use immutable bootstrap; `bin/ui.js` consumes internal child argv.
- Existing tests encode the current ordinary unknown-flag no-op and ordinary standalone `--session-dir` rejection. Those launch-specific assertions must change deliberately, while unsupported bare words, `update:` notation and comparison operations remain unchanged.
- Existing selected-release tests already cover structured runtime payload authentication and rejection of old parsers. #927's packaged color fixture launches both public entries; lifecycle and engine fixtures cover real extension startup, model overrides, follow-up/steering and replacement. Extend these boundaries rather than introducing a second framework.

These are source-inspection findings, not a claim of executed baseline tests, packaged certification or a live Firstmate reproduction.

## Goals / Non-Goals

**Goals**

- Normal `a1` accepts the implemented interactive subset without losing A1 UI, settings, commands, APIs or isolation.
- One interactive-options implementation feeds the existing normal intent/bootstrap/runtime through two explicit grammar adapters.
- Maintenance commands cannot become prompts, and instruction words cannot accidentally execute maintenance.
- Supported options survive all supported launch entries; unsupported public options and incompatible selected releases fail visibly.
- Help and docs accurately distinguish ordinary commands, interactive options, literal prompts and opt-in Pi-style instructions.

**Non-goals**

- Full Pi RPC, JSON/print, maintenance, display/trust or every session flag; dependency upgrades or changing account/provider credentials.
- Implicit ordinary positional prompts, removal of legacy quiet word spaces, comparison-profile changes or a global `pi` replacement.
- New compatibility services, profiles, registries, endpoints, daemon processes or a generic command framework.
- Firstmate/Herdr repository or live-state changes, catalog refusal removal, watcher/stale-wake repair, crash-residue recovery or lifecycle redesign.
- Merge, publication, global installation, deployment, live-session restart or physical desktop certification.

## Decisions

### 1. Keep grammar routing small and explicit

Ordinary control dispatch recognizes its existing leading command namespaces first. Valid and malformed update/package/worktree/session commands continue through their existing handlers and diagnostics, never through a model fallback. Ordinary no-argument startup remains normal A1. Existing `a1 pi` comparison/package routing remains capability-dependent and separate.

For an ordinary leading option other than standalone help/version, select interactive/discovery parsing once and never switch back to control routing midway. Ordinary interactive parsing permits no bare prompt tokens before `--`, except the existing optional catalog search operand. A bare `update` after `--model MODEL` is an error explaining the boundary, not maintenance and not an implicit prompt. Any text after the first `--`, including command words or option-looking tokens, is literal prompt data.

A leading unsupported bare word outside this launch-option scope retains today's quiet no-op; this includes misspelled commands and removed `solo`/`tabs` words. A leading unknown flag is now a launch diagnostic, not a no-op. Test the distinction explicitly. Do not route all A1 argv through `parsePiCompatibleCommand`.

The Pi adapter retains positional instruction collection, interleaved supported options and its existing `--` behavior. `pi update` remains an instruction. It never delegates instruction words to ordinary maintenance dispatch.

### 2. Extract one public interactive-options implementation

Keep public argument policy in the CLI owner, with a focused shared parser/normalizer used by both adapters; retain profile/intent construction in the launch owner. Shared metadata can describe the supported flag names and help text without becoming a general command framework. Both grammars produce the same owned startup fields and `RuntimeLaunchOptions` for equivalent supported input.

The shared implementation owns option arity, singleton duplicates, repeatable `-e`/`--extension`, path normalization against the original launch cwd, model/provider/thinking fields, comma-separated tool exclusions, session/storage/color collection, discovery selection and extension long-flag collection. Preserve builtin extension identifiers. Ordinary standalone `--session-dir` becomes supported just as in the compatible entry. Preserve existing session writer/fork semantics and canonical path checks in their current owners.

Audit before extracting: required values must not swallow missing-value flag tokens unnoticed; singleton aliases and option order must not evade duplicate checks. Existing engine model lookup/clamping, explicit-extension import failures, registered-flag validation and tool selection remain authoritative. Unknown syntactically valid long options are provisional extension flags, not automatically supported options: the loaded registration must accept them before session startup succeeds. Arbitrary short flags and explicitly unsupported Pi modes remain errors. Do not remove support for actual registered extensions just to reject unknown long flags earlier.

Use existing intent, color, session and neutral runtime validation; preserve NUL refusal and 32768-byte joined prompt/runtime bounds. Literal token text and order survive within the existing single-space joining contract; no shell evaluation or promise of recovering shell-stripped quoting. Keep invocation-only overrides nonpersistent, and preserve explicit effort precedence/model clamping and resumed-session override behavior in the Pi integration owner.

### 3. Separate public syntax from internal child transport

Public ordinary and Pi-compatible parsing must reject `--runtime-options`, including when it follows an otherwise valid public launch flag. It must not become a registered-extension escape hatch.

Keep the existing bounded structured serializer and internal selected-release parser for `bin/ui.js`, intent validation and development transport. Make public versus child consumption explicit through narrowly named functions or a clearly private transport entry, not a caller-controlled public CLI switch. Do not broaden foundation into a public grammar or move Pi knowledge into neutral transport. Preserve architecture DAG/public exports and authenticated selected-release capability checks; no new owner or governance exception is planned.

### 4. Reuse discovery and share only interactive help metadata

Expose catalog as an ordinary CLI result/handler, preserving dependency-light dispatch. Consolidate the current catalog invocation sequence so both public entries reuse normal-profile preparation, Firstmate refusal before any extension factory, package configuration and the existing engine query. Do not import private engine code into CLI policy or duplicate the refusal in two growing entrypoints. The engine remains the catalog owner; concrete wiring stays in shipped entries or existing composition boundaries as appropriate to startup constraints.

Catalog retains current search grammar, accepted runtime options, session/prompt conflict checks and extension-factory restrictions. It starts no UI/session, publishes no interactive identity and contacts no model. Firstmate operational selectors/native-host claims still produce focused failure; do not strip selectors to evade the refusal.

Share interactive flag descriptions where practical. Ordinary A1 help/version retains A1 identity and maintenance documentation; compatible help/version truthfully names A1 and pinned Pi 1.5.2 rather than faking an upstream executable version. Help/version must not load extension factories, start sessions, publish runtime identity or contact a model, including under Firstmate-scoped environment variables. Do not silently introduce new mixed help/launch grammar.

### 5. Preserve existing launch and product ownership

Audit ordinary production CLI, compatible Node entry and real `pi` shim, development `scripts/dev` routing, UI child parsing and immutable bootstrap/guardian/reselection. All interactive routes use the same normal intent and structured argv transport. Do not infer product capabilities from executable spelling, add environment payloads or concatenate prompts into shell commands.

Retained runtime capability support must remain authenticated against the ultimately selected release. An older runtime that cannot accept supplied options must fail rather than lose options or retry without the prompt. Preserve no-payload fallback behavior, independent process identity, extension startup ordering, invocation overrides, task-copy cwd and new/resume/fork/reload semantics.

Reuse #927's shared integration context and endpoint/readiness/disposal logic unchanged. Existing color/API and lifecycle fixtures should accept equivalent launch cases from each adapter. If a newly reproduced runtime defect requires redesign beyond argument transport, present that scope separately instead of adding it silently.

## Behavioral examples

These describe semantics, not commands executed during planning:

| Invocation | Result |
| --- | --- |
| `a1 update` | Existing A1 update handler |
| `a1 worktree list` | Existing worktree handler |
| `a1 session color get ...` | Existing public color command |
| `a1 -- update` | Normal A1, literal prompt `update` once |
| `a1 --model MODEL -e extension.ts -- "update the README"` | Normal A1 with model/extension and literal prompt once |
| `a1 --model MODEL update` | Nonzero boundary guidance, no maintenance or prompt |
| `a1 --unknown` | Nonzero unsupported/unregistered launch option diagnostic |
| `a1 typo` / `a1 update:old` | Existing quiet reserved/unsupported word behavior |
| `pi update` | Normal A1, positional instruction `update` |
| `pi -- "worktree list"` | Literal instruction, not a worktree command |
| `pi -e extension.ts -- task` | Same normal-product intent as equivalent ordinary launch |
| `a1 --runtime-options ...` | Rejected public internal-payload syntax |

## Implementation sequence

The PR's three ordered Implementation outcomes map exactly to the three task groups in `tasks.md`. Deliver each outcome's code and tests, tick its task group, commit/push and tick only its PR marker before starting the next. Tests being written determines ticks; later CI/manual results do not delay them. The final outcome includes product-parity fixtures and unified interface documentation, not lifecycle reinvention.

Before any Pi SDK/harness implementation changes, read the installed CLI README, SDK, extension and environment documentation and applicable examples in full, including relevant cross-references. Planning has inspected repository contracts only; it has not claimed that implementation prerequisite is complete.

## Validation strategy

After implementation authorization, use focused changed-owner files, typecheck, strict OpenSpec validation and applicable architecture/startup checks. No preflight, directory-wide suite, fast/full/release tier, live account or live Firstmate worker is requested. Broad regression belongs to existing CI. Avoid adding production diagnostic modes solely for tests.

- **Outcome 1:** extend `test/cli/dispatch.test.ts`, `test/cli/pi-compatible.test.ts` and `test/features/launch/interactive-arguments.test.ts`; compare equivalent intents for every supported flag/order/repetition, singleton/missing-value failures, boundary bytes, extension registration, public/internal payload separation and control/legacy no-op routing.
- **Outcome 2:** extend `test/cli/pi-compatible.integration.test.ts` or a shared CLI-entry fixture to spawn both shipped public entries for truthful help/version, malformed input and shared catalog with isolated home/runtime state. Assert no session/publication/factory effects for help/version; catalog can load factories only under its existing restrictions, and Firstmate-scoped calls refuse before a marker-writing factory. Reuse `test/integrations/pi/engine/compatible-launch.integration.test.ts` for real model, registration, denylist and explicit import semantics.
- **Outcome 3:** extend `test/features/launch/development-launch.test.ts` and `test/foundation/release/startup-arguments.integration.test.ts`, and reuse `test/composition/pi-compatible-colors.integration.test.ts` plus `test/composition/pi-compatible-lifecycle.integration.test.ts`. Spawn actual public entries through packaged authenticated bootstrap and supported development routing with disposable state. Assert model/effort, explicit extension-before-startup, prompt exactly once and A1 profile, plus unsupported retained-runtime refusal. Use deterministic offline model transport, neutral terminal/external Core ports and existing fixture seams, not real accounts or production Firstmate state. A `--print-environment` transport inspection alone cannot establish startup or prompt delivery.
- **Representative parity:** same supported UI/settings and public color API, one runtime identity across reporting/control/session context, attached task-copy tools, extension commands/events, steering/follow-ups and new/resume/fork/reload/replacement disposal/readiness. Parameterize existing fixtures where practical rather than multiply frameworks.

Report parser, subprocess, development, selected-release, engine and product fixture results separately. None certifies live Firstmate watcher delivery, operational-home correctness, installed global command resolution or physical terminal behavior. No executable implementation exists in this draft, so no product test/build is claimed. Planning checks passed with repository-pinned OpenSpec 1.11.0 strict change validation and the delivery body checker (`ok: true`, `complete: false`). The PR body retains three unchecked outcomes and no final Acceptance section.

## Risks and disposition

- **Legacy behavior accidentally broadened:** explicitly preserve quiet unsupported bare words and comparison subcommands while making leading launch flags fail usefully.
- **Public/internal parser conflation:** reject serialized runtime payloads at both public entries and retain a separately exercised internal round-trip.
- **Extension ambiguity:** retain existing registration authority and recommend `--` before literal prompts; do not guess maintenance routing from words consumed as option values.
- **Duplicate normalization or catalog forks:** consolidate existing policy once; keep engine lookup in its owner and use public imports consistent with the DAG.
- **Runtime parity tests overstated:** reuse the integrated lifecycle and separate deterministic fixtures from any later independently authorized live certification.

No missing scope decision was found during planning. Implementation and its test results remain pending user authorization. The retained Firstmate catalog refusal and absence of full Pi CLI/RPC/live deployment certification are intentional exclusions, not silently completed work.
