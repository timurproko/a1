## Context

See `proposal.md` for motivation and the four delta specs for externally observable behavior. This is a cross-cutting correction across CLI parsing, public engine adapters, workflow controllers, and owned message rendering, so a design is needed even though the initial screenshot exposes only one line.

The audit baseline is `@earendil-works/pi-coding-agent` 0.84.2, the currently certified repository dependency. Pi's distributed `package-manager-cli.js`, `core/package-manager.js`, `modes/interactive/interactive-mode.js`, model-selector component, and `config.js` are read-only references, not new production import targets.

Current source findings:

| Surface | A1 owner | Finding / initial disposition |
| --- | --- | --- |
| Model refresh aliases | `src/cli/packages.ts`, `src/integrations/pi/engine/package-integration.ts` | Explicit product-specific rendering exception; timeout/provider detail differs. Correct. |
| Install/remove/list/package-update success | Same owners | Green/dim/bold messages already match for accepted user scope. Preserve and prove independently. |
| Missing update target | Package engine adapter | Literal/prefix `isConfigured` check bypasses Pi identity matching and suggested-source exception. Correct. |
| Operational details | Package engine adapter | `describe` flattens whitespace and caps 600 characters; settings errors are not drained/reported. Correct. |
| Package syntax/help | `src/cli/dispatch.ts` | Product diagnostics, no focused usage, explicit help treated as an error. Correct presentation for supported subset. |
| Authentication messages | `src/integrations/pi/engine/adapter.ts`, `session-ui/session-shell.ts` | API-key success uses OAuth label; empty logout and contextual failures differ; outcome-dependent messages are incomplete. Trace and correct. |
| Fork/clone empty states | Same interactive owners | Errors replace pinned dim statuses. Correct. |
| Import/share | Engine workflow adapter | Import errors lose context; share errors differ and viewer URL uses the obsolete `pi.gptscript.ai/gist/` base. Correct. |
| Ordinary result presentation | `session-ui/session-shell-root.ts`, `components/shell-presenters-info.ts` | Status presenter already uses wrapped dim text; errors/warnings/name/debug/new cases include raw fixed-indentation rows. Preserve correct statuses and correct route-specific geometry. |
| `/new` | Shell-root result presenter | Text/color match; vertical padding differs from pinned `Text(..., 1, 1)` plus spacer. Correct. |
| Remaining supported routes | Workflow list/controllers/presenters | Many normal success paths already match; inventory all outcomes before asserting completeness. |

The initial audit is source evidence, not exhaustive physical-terminal certification. The existing test suite asserts several package success strings but checks only routing, not exact output, for model refresh.

## Goals / Non-Goals

**Goals:**
- Keep formatting decisions near their owning CLI or interactive boundary and preserve upstream operation facts until rendering.
- Distinguish message kinds and lifetimes explicitly so wording fixes cannot silently change status into error, duplicate a success line, or lose warning sequences.
- Make regression expectations independently traceable to pinned behavior rather than another A1 implementation path.

**Non-Goals:**
- No dependency upgrade, installed-Pi patch, stock interactive-root construction, private deep import, transparent CLI relay, or alternate runtime.
- No new package operations, project-local package/trust support, `config`, `--extension` alias, general Pi CLI flags, or newly discovered interactive commands. Explicit help for existing package verbs is the only newly accepted informational syntax.
- No changes to A1 self-update/version policy, unknown-command no-ops, profile storage ownership, declared settings replacement, viewport customization, or bare-A1 spinner punctuation.
- No broad authentication/session redesign. Controller changes are limited to faithfully performing and reporting the existing supported command outcomes; missing supporting behavior must not be replaced with a fabricated message.

## Decisions

### 1. Define parity over equivalent supported operations, not entire executables

Use a per-command outcome inventory keyed by pinned source branch and A1 route. Record expected text or silence, severity, stream, renderer, contextual substitutions, and test checkpoints. Extend the existing provenance/parity machinery rather than create a second unconnected truth source.

The CLI matrix includes both model-refresh aliases, install/remove/uninstall/list, updates of all packages and one source, operational/settings diagnostics, and explicit help/syntax cases. The interactive matrix includes every name in the existing supported workflow and hidden-command lists: settings, model, scoped-models, export, import, share, copy, name, session, changelog, hotkeys, fork, clone, tree, trust, login, logout, new, compact, resume, reload, quit, debug, arminsayshi, and dementedelves. Include command-owned selectors' refresh/empty/cancel states; discovered unsupported commands are noted, not implemented.

Approved substitutions are actual A1 profile/session/cwd/runtime values and executable invocations in guidance. Preserve existing declarations for owned UI replacements/layout; no whole-message whitelist or ANSI stripping. Numeric package syntax exit status remains A1's two, while operation failure is one and help/success is zero: this request is for wording/style, not a silent process-contract change.

Alternative rejected: comparing complete `a1 --help` with `pi --help`, or routing commands through Pi's main entry. Both would falsely imply support for Pi operations that A1 intentionally forbids.

### 2. Keep CLI styling terminal-aware and preserve operation diagnostics

Remove the refresh-only formatting exception. Render CLI successes/errors with Chalk's standard green/red roles, not theme tokens or hardcoded screenshot RGB. Keep a final newline outside summary styling as Pi does. Use the existing injectable style boundary to test enabled and disabled colors without changing global terminal configuration.

In the package adapter, let public `DefaultPackageManager.update` resolve identities and produce its own missing-source suggestions. Preserve thrown `Error.message` unchanged in the structured outcome; use the pinned non-Error fallback. Keep removal's boolean not-found distinction because Pi prints that case differently. Match model runtime timeout and provider-error construction exactly, keeping the bounded refresh and A1 profile binding.

Expose/drain user-scope settings diagnostics through an owned typed callback or result channel before progress, preserving warning and secondary-detail order. Progress stays dim and npm/git child output remains inherited. Profile initialization failures remain A1-specific because standalone Pi does not execute that A1 preparation step. Do not enable project trust or read `.pi` settings to generate additional warnings.

Alternative rejected: retaining a shortened diagnostic internally and reconstructing the visible text later. The lost whitespace, suggestions, and detail cannot be recovered reliably.

### 3. Separate parser classification from diagnostic presentation

Represent recognized package syntax failures structurally (canonical verb, option/argument/source problem, supported usage) instead of baking unstyled product strings into each parser branch. The CLI output layer applies red primary and dim guidance lines. Do not style every A1 parser error indiscriminately.

For equivalent missing-source, unknown-option, and extra-argument branches use Pi's text and ordering, canonicalizing `uninstall` to `remove`. Preserve A1-specific pinned-runtime/profile/local-scope restrictions and A1-only update-selector diagnostics. Recognize explicit `-h`/`--help` first for supported package verbs, without preparing a profile or dispatching work. Use Pi's help section typography and applicable prose, but project the grammar: `a1 pi update` help describes `--extensions`, `--models`, and `<source>`, not Pi self-update, local scope, or unimplemented flags. Do not print empty option sections or examples for unsupported operations.

Alternative rejected: blindly replacing `pi` with `a1 pi` in stock full help or errors. It advertises forbidden syntax and can corrupt payload text containing the same word.

### 4. Preserve workflow outcomes and sequences before rendering

Use the existing owned workflow/controller boundaries to carry semantic status/warning/error and route-specific presentations; extend their typed results only where a single completed/failed string cannot represent the pinned sequence. Do not infer severity from message prefixes such as `Wait for` or `Usage:`. A successful credential write followed by a failed model selection is not one generic failure or unconditional success.

Authentication should use pinned auth-type labels, selected-model clauses, local-state synchronization errors, and background catalog warnings tied to truthful public runtime results. Keep warning delivery bound to the current controller/session lifecycle. Preserve API-key/environment separation and never include credential values in messages or evidence.

Use pinned share-viewer semantics (`PI_SHARE_VIEWER_URL` or `https://pi.dev/session/`, followed by `#<gist ID>`) through a supported public API if available, otherwise a minimal provenance-recorded owned helper. Do not reuse the old hardcoded URL. Retain distinct gh-absent, gh-not-authenticated, export, gist-creation, parse, and cancellation states, with cancellation terminating owned work and preventing late success output. Preserve import confirmation/missing-cwd recovery and add contextual errors at the same boundary as Pi.

Alternative rejected: editing only returned success literals. It leaves wrong severity, partial-success behavior, cancellation, and supporting model/share outcomes uncorrected.

### 5. Render messages through coherent owned component presenters

Retain the working `showStatus` equivalent, including adjacent-status replacement. Route errors/warnings and special notices through owned presenters using pinned `Text`/`Spacer` semantics rather than arrays containing raw embedded newlines or unconditional single-space prefixes. Error output obeys the current `outputPad`; warnings and route-specific informational text retain their own pinned padding rather than a universal setting. `/new` retains its distinct accent and vertical padding. Structured `/session`, `/hotkeys`, and `/changelog` stay structured and are not converted into notification rows.

Keep transcript anchoring, invalidation, resize, and focus restoration with the existing shell owner. Bare-A1 viewport differences remain declared; the message components and shared baseline controller do not acquire viewport-specific copies.

Alternative rejected: rendered-string substitutions and globally restyling every completed result as green. CLI uses Chalk green success; Pi interactive statuses are commonly theme-dim, and special messages have their own presentation.

### 6. Prove outputs independently, with deterministic external effects

Use untouched pinned executable/source producers in isolated test processes as the oracle. Expected output must not import A1 renderers. Reuse repository-supported deterministic adapters or test-boundary dependency substitution for model catalogs, credentials, filesystem outcomes, and gh/npm/git processes without modifying the installed Pi payload. Use temporary profiles and synthetic credentials, no real credential migration, network-dependent package installs, or real gist uploads.

Compare CLI stdout and stderr separately, literal content/newlines and color-enabled/disabled ANSI, plus exit codes with only the documented syntax exception. Compare interactive terminal cells and message transition checkpoints at ordinary/narrow widths, padding zero/one, and supported themes/color capabilities, including resize/modal transitions and long multiline errors. Bounded producer timeouts must fail evidence, not produce an empty passing comparison.

Include preservation tests for existing successful transcripts, profile isolation, untouched child output, no runtime launch, unsupported no-ops, pinned-update rejection, silent cancellations, and declared customizations. Add mutation/negative assertions so a wrong period, green-to-dim change, omitted line, wrong severity, missing wrap, or widened normalization fails.

Do not equate controlled ANSI tests with physical color certification. The screenshot acceptance needs an actual Windows Terminal/Git Bash comparison of both CLI aliases and representative interactive outcomes using equivalent profile state and color-preserving checkout launchers.

## Risks / Trade-offs

- [Broader matrix than one screenshot] -> Inventory first, preserve already-matching paths, and group corrections by CLI, workflow semantics, and presenters; do not invent new commands to fill coverage.
- [Help parity conflicts with A1's smaller grammar] -> Explicit supported-subset projection and contextual substitutions, with no complete help on failure and tests for forbidden options.
- [Error fidelity exposes longer messages] -> Preserve the same public detail Pi emits; bound test artifact sizes separately without truncating live output or capturing real secrets.
- [Asynchronous auth/share messages outlive their session] -> Bind completion/warning delivery to owned lifecycle and cancellation; cover late results and partial success.
- [Synthetic-only fixtures hide upstream drift] -> Independent pinned producer plus source branch provenance, not A1-generated expected strings; re-check the pin when implementation starts.
- [Terminal palette or viewport differences mask fixes] -> Separate Chalk CLI tests from themed UI cell comparisons and declared layout differences; retain physical review.
- [Adjacent active changes touch the same shell/presenters] -> Rebase the accepted implementation plan against current integration state and keep declaration/provenance changes narrowly scoped.

## Migration Plan

No configuration or persisted-data migration is required. The visible output correction intentionally removes A1-specific model-refresh summaries and makes supported explicit package help succeed; existing operation and syntax exit-code contracts otherwise remain intact. Specification approval precedes a separate implementation change. After code validation, compare the exact runnable artifact in the terminal before acceptance. If a correction regresses command behavior or lifecycle, revert the affected implementation commit and reopen its inventory outcomes; never restore a false parity claim by normalizing the difference away.
