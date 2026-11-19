# Implementation evidence

## Accepted scope and original failure

- Planning PR [#381](https://github.com/timurproko/a1/pull/381) merged with required CI passing as `55d8b250e1240c359a6c72fd771b6b7c8961b80f`.
- Implementation began from that commit in `D:/Git/a1/.worktrees/implement-scoped-model-platform-hints`. It was advanced to current `origin/develop` at approved amendment [#382](https://github.com/timurproko/a1/pull/382), merge `c4cc1e84ca53439d2a133ed5d941652858ff0ad5`, preserving the partial implementation and completed-task evidence.
- Original [Full regression run 34848060922](https://github.com/timurproko/a1/actions/runs/34848060922), head `b62aaa51753653685387a73f9d51f23bacd8edf2`, [macOS Node 24 job 103988900573](https://github.com/timurproko/a1/actions/runs/34848060922/job/103988900573).
- Both `matches real command outputs in truecolor with only the two named exceptions` and its `256color` counterpart failed at `dark/0/scoped-models/open/80 selector messages` in `command-outcome-parity.test.ts`.

The pinned footer wraps before `option+up/option+down reorder`; the owned footer fits raw `alt+up/alt+down` on the preceding row and wraps before `reorder`. The owned local `keyText()` joined effective IDs without the pinned Alt-modifier display adaptation. This is a presentation/layout omission, not a color-depth or Node-version defect. Input matching continues to consume logical Alt IDs.

## Before correction

On Windows Node 24, focused tests with synchronously scoped display platforms produced **3 failures / 10 passes** against unchanged runtime code. All three failures were Darwin default/custom/refreshed Alt-label cases; Windows/Linux cases and unbound/non-Alt cases passed. The scope restores the platform descriptor, effective keybinding owner, theme, and capabilities. Native macOS CI remains required; platform scoping is not claimed as native acceptance.

## Implemented correction and validation

The local formatter now converts only the Alt key part to `option` on Darwin before styling/layout. Binding identities and matching remain unchanged. The selector's attribution describes that local adaptation.

The original provenance check correctly rejected a stale owned-file digest. Amendment #382 explicitly permitted its refresh. The selector's `localSha256` is now `23d82369015674ca5966a9f963f977205a1462b15c3cacec2c45f323422415bb`; an independent SHA-256 calculation matched it. Comparing parsed ledger contents with the implementation base after excluding this entry's digest/description proved every other field and entry unchanged, including upstream `sha256` and approved deviations. No rendered baseline changed.

Validation before the code-PR push:

- Windows Node 24.16.0: **17 passed** across the 13 focused selector tests and four independent command-outcome parity tests.
- Windows Node 22.23.2: the same **17 passed**, without added skips, retries, or timeout changes.
- Independent subprocess producers compare complete styled rows at widths 80/28, dark/light themes, both padding variants, and truecolor/256-color. Added cases cover custom alternatives, dirty/saved custom actions, and unbound hints; effective binding identities are also compared.
- Negative checks reject the opposite platform label, extra semantic ANSI, and collapsed wrapping using the unchanged parity comparator. Existing named outcome exceptions remain unchanged.
- Typecheck, build, full code-documentation governance, architecture/provenance checks, strict OpenSpec validation, and whitespace checks passed.

## Manual review and remaining gates

Implementation PR: [#386](https://github.com/timurproko/a1/pull/386), branch `fix/scoped-model-platform-hints`, implementation commit `47c18818`. The PR is open for required CI and maintainer acceptance; auto-merge is disabled.

From `D:/Git/a1/.worktrees/implement-scoped-model-platform-hints`, build and launch with `npm run build && ./scripts/dev pi`, then open `/scoped-models`. At 80 columns and narrower widths, confirm macOS shows Option hints while Windows/Linux retain Alt; reorder/toggle models, check unsaved status, save explicitly, and cancel. Labels and wrapping must remain correct after catalog refresh. Do not treat mocked-platform tests as native macOS acceptance.

Required code-PR CI, native four-lane Full regression, maintainer acceptance, and post-merge exact-package results remain pending. No local full suite, publication, or user-desktop automation has been run. The code PR must stay open with auto-merge disabled until explicit acceptance and manual merge authorization.
