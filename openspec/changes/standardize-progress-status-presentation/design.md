## Context

See `proposal.md` for motivation. Bare A1 currently carries punctuation inside `OwnedUiSessionViewModel.status.workingMessage`: the engine emits `Working...`, `Retrying…`, or `Compacting…`, and the shell passes that string to the spinner-backed Pi loader. Extension working-message overrides enter the same shell status path. The result is visually inconsistent and leaves every producer responsible for punctuation.

The neutral component layer must not import the Pi adapter. The source-synchronized Pi status-indicator implementation and installed Pi packages are provenance-controlled and must remain unchanged. Bare A1 may declare an owned presentation difference at its adapter boundary, while `a1 pi` and vanilla Pi remain comparison authorities.

## Goals / Non-Goals

**Goals:**

- Give the A1 component layer one idempotent progress-message formatter.
- Make the spinner-backed bare-A1 status surface apply that formatter to built-in and extension messages.
- Keep engine lifecycle messages semantic and free of presentation punctuation.
- Prove exact ASCII punctuation and unchanged spinner/layout/lifecycle behavior.

**Non-Goals:**

- Replacing the loader, spinner frames, timer, theme, or status placement.
- Redesigning retry countdowns, cancellation hints, compaction lifecycle, or extension APIs.
- Normalizing ordinary notices, diagnostics, command results, or non-spinner status lines.
- Modifying synchronized/upstream Pi components or comparison routes.

## Decisions

### 1. Own progress punctuation in a neutral component utility

Add a small A1-owned progress-status unit under `src/ui/components/` and export it through the public component barrel. Its formatter accepts semantic progress text and returns the same text with one canonical terminal marker: exactly three ASCII periods.

The formatter removes one terminal Unicode ellipsis or a terminal run of ASCII periods before adding `...`. It is therefore idempotent for already-canonical text and tolerant of legacy or extension-provided punctuation. It does not rewrite punctuation elsewhere in the message.

This is preferred over changing each event literal because producer-by-producer edits preserve the ownership bug. It is also preferred over modifying Pi's `Loader` or source-synchronized `StatusIndicator`, which would alter comparison behavior and provenance.

### 2. Apply the rule once where bare A1 chooses a spinner-backed status

The bare-A1 shell status adapter will normalize the final effective message after resolving the default, engine state, and extension override, immediately before constructing the existing spinner component. This single boundary covers ordinary work, retry, compaction, and extension working messages without branching on status kind.

The adapter will continue to use the existing public TUI loader component, timing, colors, geometry, invalidation, disposal, and terminal behavior. Non-busy text branches will not call the progress formatter because they do not render a spinner.

An alternative was to add a progress marker during model validation. That would conflate semantic state with presentation and would also alter consumers that do not render a spinner, so it is rejected.

### 3. Make built-in engine messages semantic labels

The engine adapter will emit `Working`, `Retrying`, and `Compacting` as work-state labels. The shell component supplies the visible marker. Existing state-kind ownership and transition logic remain unchanged, including restoring working after retry/compaction and clearing only the state ended by its matching event.

Keeping legacy-suffixed extension strings valid is intentional: the component normalizer converts either ellipsis form and prevents duplicate markers. No extension migration is required.

### 4. Treat this as a narrow declared bare-A1 presentation difference

The source-synchronized status-indicator classes and their pinned parity test remain byte-for-byte behavior authorities. Only the A1-owned bare-session composition invokes the new formatter. Provenance documentation will record the three-period rule as a deliberate product-owned difference so parity tooling does not generalize it into an upstream modification.

### 5. Gate behavior at formatter, shell, engine, and comparison boundaries

Focused evidence will cover:

- exact formatter output for no suffix, Unicode ellipsis, one/many periods, and an already canonical suffix;
- built-in working/retry/compaction transitions using semantic labels in the engine model;
- bare-A1 spinner rows showing exactly `Working...`, `Retrying...`, `Compacting...`, and normalized extension text;
- unchanged ANSI spinner styling, row geometry, replacement, and cleanup;
- unchanged synchronized Pi status-indicator parity and regular comparison-route evidence.

Physical acceptance will reproduce the user's working and compaction screenshots from the exact candidate build and verify that both use the same three ASCII periods.

## Risks / Trade-offs

- **[Risk] An extension intentionally ends its working text with a different number of periods or a Unicode ellipsis.** → Spinner-backed progress text is explicitly component-owned; normalize only the terminal progress marker and leave all other message content intact.
- **[Risk] A formatter is accidentally applied to a non-progress notice.** → Call it only in the shell branch that constructs the animated status component and test non-spinner branches unchanged.
- **[Risk] Editing synchronized Pi code would create provenance drift.** → Keep synchronized status classes untouched; add the formatter to A1-owned components and record the owned adapter difference.
- **[Risk] Removing punctuation from engine labels could expose bare labels in a race or ready-state branch.** → Exercise lifecycle transitions and assert the active spinner branch always formats the effective message while non-spinner states retain their existing ownership and timing.

## Migration Plan

1. Add the neutral formatter and its exact-output tests.
2. Remove presentation punctuation from built-in work-state producer labels.
3. Apply the formatter at the bare-A1 spinner construction boundary.
4. Add shell, lifecycle, extension, parity, and provenance evidence.
5. Validate CI and the exact Windows Terminal candidate before manual merge authorization.

Rollback is a normal commit revert: no persisted data, settings, protocol versions, or external dependencies change.
