# Design

## Context

Path chips currently use deterministic suffix candidates to distinguish paths with the same basename (`src/app/session-shell/path-chip-presentation.ts`). Filename-bearing image chips carry a durable payload key in their tag (`src/contracts/owned-ui/prompt-chips.ts`). Those values must not be removed from the stored chip identity merely to simplify display.

The editor already supports source ranges hidden for presentation, with source/display column mapping in `owned-editor-ux.ts`. Submitted and queued prompt presentation already protects canonical chips during wrapping. These are the intended integration points, subject to implementation inspection of legacy labels and column mapping.

## Decision

Separate attachment identity from its visible label. Derive a compact icon-plus-basename display without rewriting the backing chip or stripping arbitrary authored text. Keep path normalization, collision resolution, durable image identifiers, copy expansion, and model-facing values authoritative.

Hide the icon/label separator and internal suffixes in the live editor using mapped source ranges where applicable. Use the same attachment-label policy before width measurement and wrapping in submitted and queued prompts. Keep canonical legacy syntax recognized so recalled existing chips remain functional.

## Risks

- Different attachments can share the same visible basename. Their identities and occurrence-specific resolution must remain independent.
- Hidden source bytes affect cursor placement, mouse selection, and width accounting; focused tests must cover these boundaries.
- A filename can contain a literal hash or spaces. Strip only recognized identity metadata, never arbitrary filename characters.

## Validation scope

Focused tests for canonical/legacy chip presentation, editor hidden-range geometry, duplicate basenames, durable image identity, wrapping, and exact copy/history/submission resolution; typecheck and strict OpenSpec validation. No broad suites.

## Known gaps

None planned. Clipboard screenshot labels without a filename, URL chips, and text-paste chips are outside this attachment-filename presentation change.
