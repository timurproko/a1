## Context

See `proposal.md` for motivation. The planning worktree is based on `3cd9bfee1747be67cb35f79964ac2000a2cbc7d4`, fetched from `origin/develop`. This proposal addresses only the scoped-model presentation failure; it does not revise the separate nightly lease/frame changes or concurrent event-frame work.

### Evidence and attribution

[Full regression run 34848060922](https://github.com/timurproko/a1/actions/runs/34848060922), head `b62aaa51753653685387a73f9d51f23bacd8edf2`, failed in [macOS Node 24 job 103988900573](https://github.com/timurproko/a1/actions/runs/34848060922/job/103988900573). Both color-mode cases of `command-outcome-parity.test.ts` failed at `dark/0/scoped-models/open/80 selector messages`:

```text
Pinned: ... ctrl+p provider ·
        option+up/option+down reorder · ctrl+s save · all enabled
Owned:  ... ctrl+p provider · alt+up/alt+down
        reorder · ctrl+s save · all enabled
```

The actual logs compare complete styled, padded rows. The shortened example above illustrates the different wrapping, not a proposed normalization. All four regression files changed in #374 passed on that macOS lane; Linux full regression passed. Windows lanes were still running when this incident was inspected, so this proposal makes no claim about their final outcome.

The owned `scoped-models-selector.ts` defines a local `keyText()` that only joins `getKeybindings().getKeys(...)` with `/`. It is used by the header save instruction and every footer action. Pinned Pi 0.84.2's key-hint implementation additionally formats each `+`-separated key part, replacing an Alt modifier with `option` on Darwin, while retaining non-Alt spelling and alternative order. A nearby tree selector already carries equivalent local display adaptation; a broad selector migration is unnecessary for this failure.

The selector is classified `owned-presentation` in the pinned-source ledger with no approved deviations. Correcting its local display adapter restores the existing parity contract; it is not a new product exception. No local suite or runtime modification has been performed during planning.

## Goals / Non-Goals

**Goals:**

- Restore pinned platform label and layout semantics at the scoped-model component boundary.
- Keep display strings separate from effective key identities and action dispatch.
- Prove both the observed default footer and custom/unbound key-hint behavior without weakening independent evidence.

**Non-Goals:**

- No global binding changes, automatic Alt-to-Option configuration migration, or shortcut remapping.
- No unrelated tree/session selector refactor or central formatting-framework redesign.
- No changes to model selection, provider grouping, ordering, persistence, refresh workflows, or cancellation semantics.
- No new dependencies, private/deep production imports, pinned-package patches, baseline regeneration, additional parity exceptions, test retries, timeouts, or matrix changes.

## Decisions

### 1. Correct the shared local label boundary before layout

Adapt the selector's existing local `keyText()` boundary to apply pinned platform formatting to each effective key alternative before joining alternatives and before passing text to theme/`Text` layout. Match Alt as a modifier part rather than applying a broad substring replacement to rendered rows or unrelated text. Preserve non-Alt key spelling, modifier combinations, ordering, separators, and the empty list's empty output.

All scoped-model header/footer hints already pass through this boundary, so correcting it fixes default reorder help and custom save/bulk/provider bindings consistently. Continue consulting the effective binding manager whenever the existing component rebuilds its hints; do not cache default labels or promise a new live-rebinding lifecycle beyond pinned behavior.

Keep the correction local unless an existing boundary-safe formatter can be reused without altering other components. Do not introduce a new exported API or private pinned import just to avoid a small display transformation. The input handler continues using `kb.matches()` on unchanged logical IDs.

Rejected alternatives: changing expected macOS rows to Alt would bless a production parity defect; accepting either spelling would miss wrapping errors; rewriting completed ANSI rows would format after geometry decisions and risk touching model names or status content.

### 2. Preserve independent parity and add narrow regression cases

The existing command-outcome test independently launches pinned and owned producers. It already compares exact selector rows at widths 80 and 28, dark/light themes, padding variants, and truecolor/256-color. Retain its equality checks, producer independence, and existing two unrelated named outcome exceptions unchanged.

Add focused selector cases for default bindings, custom Alt chords, multiple alternatives, non-Alt bindings, and explicitly unbound actions. Verify the save instruction as well as the footer; check dirty, saved, and refreshed state text and the corresponding action callbacks. Expected labels must not be generated by the corrected owned formatter itself. Use literal platform-specific expectations and untouched pinned captures as complementary oracles. Test-only platform scoping, if needed for focused cases, must restore state and never replace native macOS CI evidence.

Add a negative check showing that substituting raw Alt labels on macOS or changing semantic ANSI/wrapping still fails. Extend the existing cases/worker only where needed for independent custom-binding or state coverage; avoid a second large full-command harness.

### 3. Retain accurate source provenance

Keep the pinned version, source hashes, and absence of approved deviations. Update the selector's attribution comment to describe the actual local key-label adapter. If the scoped-model ledger entry's modification description needs clarification, change that description only. This is distinct from regenerating rendered baselines, which is not part of the fix.

### 4. Treat full regression and publication completion as separate evidence

Implementation must pass required PR CI and the exact command-outcome parity file in both color modes on native macOS, Linux, and Windows Node 22/24 lanes. Use the existing Full regression workflow to verify the previously failing resource-sensitive gate; ordinary fast validation alone does not close this incident.

After maintainer local acceptance and explicit manual code merge, validate a newly numbered merged implementation package with full nightly-equivalent scope and the same package digest across release lanes. This evidence may also satisfy the matching pending gate of `fix-nightly-platform-validation`, but neither change may be marked complete solely because its PR merged. Any newly surfaced unrelated failure remains a separate stream; do not absorb it into this selector fix.

## Risks / Trade-offs

- **Only default reorder labels are corrected** → Route all scoped-model hints through the same adapter and cover custom save/bulk/provider bindings.
- **Display text leaks into matching or persistence** → Assert unchanged effective binding IDs and action callbacks, including session-only changes and explicit save.
- **Platform labels create different wrap boundaries** → Format before layout and retain exact independent 80-/28-column row comparisons, not substring-only acceptance.
- **A mock platform hides native behavior** → Require native macOS parity and keep Windows/Linux checks to prove their output is unchanged.
- **A small fix triggers a wider provenance or selector rewrite** → Limit attribution changes to this port and pause for a separate proposal if another component must change.

## Migration Plan

1. Merge this strictly validated OpenSpec-only proposal.
2. After a subsequent explicit implementation request, fetch current `origin/develop` and create a fresh detached worktree and code PR citing this change.
3. Correct the local key-hint presentation, add focused regression coverage, and preserve the exact independent parity oracle and provenance.
4. Pass required CI and native full-regression coverage. Provide build-first `./scripts/dev` or `./scripts/dev pi` commands for manual selector review, including label/wrapping, reorder, save, and cancel checks; do not automate the user's desktop.
5. Keep code auto-merge disabled. After explicit acceptance and manual merge authorization, record the newly numbered exact-package validation outcome.
6. Record acceptance and archive in a specification-only follow-up only when the required evidence is complete. No stored-data migration is needed. A rollback is a new reverting commit/package; it must not modify already published bytes and would reopen the macOS parity defect.
