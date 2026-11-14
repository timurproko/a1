## Context and observed evidence

Baseline: freshly fetched `origin/develop`, `82d030bf4ca4ec5f92785ade04f5317bc9815658`. Task checkout: `D:/Git/a1/.worktrees/herdr-image-paste`; branch: `fix/herdr-image-paste`.

The user wants A1-only, automatic screenshot chips in local Herdr and remote Herdr, with the working cross-machine text copy/paste retained. No setting or Herdr frontend change is requested.

### A1 fault boundary at the investigation baseline

- `shell-clipboard.ts:capturePaste` honors provided clipboard ports first, captures the copy predecessor barrier, then uses `responseCopyDestination(process.env)` to reject native acquisition. PR #922 added Herdr identity to that copy decision; it did not independently reconsider the existing read gate.
- `response-copy-transport.ts` is the correct copy policy. Herdr identity, including an overridden `TERM_PROGRAM=ghostty`, must continue selecting the terminal route.
- `shell-editor-factory.ts` gives supplied bracketed content a text source, independent of clipboard capture. This is the boundary that protects cross-machine text from accidental replacement by native host text.
- At the baseline, `paste-helper.ts` classified supplied image paths as paths, and `prompt-chips.ts` records them as file chips. `prepareSubmission` expands these to path text; it does not attach their image bytes. `prompt-submission.ts` passes only the store's actual `images` array into prompt/steer/follow-up commands. Thus an image-looking file chip is not proof of a provider image attachment. An agent may subsequently open the file with a tool, as occurred with the supplied screenshots in this investigation.
- Direct clipboard image content already goes through preparation, screenshot-chip adoption, and actual image submission. Reuse that path.

### Transport and ownership evidence

Installed `hc --version` reports `0.1.19`. Its public schema/manual has no documented attachment-bound native-read grant or revocation. Launch identity and free-form labels are not proof of current viewer locality. No private records or clipboard contents were inspected to infer ownership.

Public Herdr frontend `src/terminal.rs` inspected near upstream HEAD `b67715e8985e6097f83f8120fc9b9e52e6596f50` explicitly skips image transfer for local terminals and forwards the paste gesture; remote images use destination-side file transfer and supplied paths. This is source evidence, not proof of either installed GUI binary. Herdr source is not being changed.

### Hermetic investigation

A generated probe imported the unchanged `ShellClipboard` and `PromptChipStore`, used a generated PNG under ignored task artifacts, and asserted:

- Herdr plus `ghostty`: copy destination is terminal; raw capture returns `paste-unavailable` before native I/O.
- A supplied quoted PNG path creates a file chip but yields zero attached images in `prepareSubmission`.
- Supplied image bytes create a screenshot chip and yield one attached image.
- No native clipboard operations or terminal-control writes occur in the probe.

The four focused existing suites passed: 78 tests across `herdr-clipboard.test.ts`, `response-copy-transport.test.ts`, `system-clipboard.test.ts`, and `prompt-chips.test.ts`. Their success was baseline evidence, not screenshot-recovery evidence: the Herdr suite then asserted the local refusal, and injected image readers bypassed that broken gate.

The first test attempt through primary's Vitest executable could not initialize because this fresh worktree lacked local dependencies. `npm ci --ignore-scripts --no-audit --no-fund` installed the lockfile dependencies, and the worktree-local rerun passed. The first generated probe attempt had an incorrect relative module URL; the corrected unchanged-source probe passed.

`npm run build`, followed by `npm run typecheck`, passed for the unchanged product baseline. The initial typecheck attempt passed the source configuration but could not check `bin` without the missing generated `dist` imports; the normal build supplied those prerequisites. Strict OpenSpec validation passed after restoring the existing raw-paste scenario heading to the proposed MODIFIED block; its proposed scope narrowing remains explicit. `git diff --check` passed. At that checkpoint no source fix or physical clipboard validation had been performed. Delivered code and current automated evidence are recorded in `implementation-evidence.md`.

## A1-only design

### 1. Independently select raw acquisition

Leave `responseCopyDestination` unchanged. Give `ShellClipboard.capturePaste` a separate named paste-acquisition decision, owned by session-shell. Preserve the captured predecessor barrier and explicit-port precedence.

Access matrix:

| Input/context | Acquisition |
| --- | --- |
| Supplied text, including large/Unicode/multiline text | Existing text source; zero native reads |
| Supplied image path | Prepare that destination-side file; zero native clipboard reads |
| Explicit clipboard port | Existing provided source and cancellation contract |
| Raw non-Herdr local paste | Existing full native image/file/text acquisition |
| Raw Herdr paste with a conventional SSH, WSL, tmux, or screen marker | Existing refusal |
| Raw Herdr paste without those markers | Image-only host acquisition; no native text or file-drop fallback |

Herdr identity grants no locality knowledge in this table. The final row is an explicit exception to the prior safety policy, restricted to an owned raw-paste gesture and image representations. It must not be enabled for supplied text, path-classification failure, file-transfer failure, or copy failure. Missing image content and unavailable screenshot acquisition report “Couldn’t paste screenshot—try again.” without changing the draft; native acquisition errors remain recoverable. Known size/count/format limits retain their actionable diagnostics. There is no hidden host-text fallback and no host-native write.

Carry image-only intent through the real native helper boundary; do not implement it by injecting a UI-thread image reader. Preserve format limits, read deadlines, predecessor failure semantics, and scalar-only diagnostics. Add source/emitted protocol tests because the helper must receive this intent.

### 2. Normalize supplied screenshot files to actual attachments

For an isolated text paste that resolves to exactly one existing supported image file, load and prepare that file inside the killable preparation boundary and adopt a ready image chip. Use decoded-content/MIME validation, bounded intake before allocation, existing byte/pixel/final-size limits, serialized conversion, and cancellation. Never infer clipboard ownership or a trusted image solely from the `herdr-paste` filename.

Keep ordinary prose, missing paths, URLs, non-image files, folders, and existing multiple/mixed path-list semantics unchanged. This first scope targets Herdr's single-screenshot delivery, not a new general multi-file image importer. Prepared file images use the canonical screenshot chip and its attachment/history contract, rather than retaining a path-reference chip. Submission contains the prepared image bytes exactly once and does not rely on a future agent read-tool call.

Image-format-looking invalid files must receive recoverable validation rather than being submitted as image data. A canceled, deleted, timed-out, or replaced paste must leave no live provisional image. Use the same attachment-backed screenshot/history lifecycle as native images; do not create a decorative file chip and label that as attachment support.

### 3. Preserve text and lifecycle contracts

Regression tests must use production source selection with hermetic native/platform seams, not just `diagnostics.clipboard.readImage`:

- Herdr ID plus `ghostty`, `herdr`, missing emulator, and emulator-only identity retain terminal copy; autocopy and explicit selection copy submit exact text once with zero native/platform writes.
- Local raw screenshot acquisition selects the image-only helper mode and submits one actual image attachment; native host text is never used in that mode.
- Markerless remote supplied short/Unicode/multiline/large text inserts once with zero native reads, even if host text/images differ.
- A quoted/spaced single destination PNG path becomes one usable image attachment without native clipboard I/O. Ordinary path lists retain their behavior.
- Known-remote raw requests remain denied. A markerless raw request selects the image-only exception; tests must state that policy truthfully rather than claiming remote locality protection.
- Pending copy barriers, later typing, undo/redo, rapid pastes, image limits, sidecars, submission/steering/follow-up, cancellation, stop fences, and helper cleanup retain their contracts.
- Non-Herdr native terminals and `a1 pi` retain their existing behavior.

Update current architecture documentation/specifications without rewriting archived PR #922 history. Ordinary progress is one completed task group/commit/push/body tick per PR outcome. Final Acceptance and current-target reconciliation precede the final outcome tick; trusted automation owns readiness/finalization.

## Decision and remaining limitation: A1-only raw-image compatibility

The initial handoff requires both automatic local native acquisition and no host acquisition in remote/unknown attachment contexts. The examined A1 input and supported Herdr metadata cannot distinguish a local raw paste key from the same raw key forwarded by a markerless remote viewer. Supplied remote image paths/text avoid that ambiguity in the normal working route, but do not make every possible raw gesture safe.

The A1-only design supports the user's ordinary local/remote screenshot and text workflows by allowing raw host image acquisition in the final table row. It does NOT preserve the initial unconditional unknown-attachment no-native-read guarantee. A markerless remote raw gesture could paste an unrelated host image. Image-only access limits the exception, but cannot prove image ownership.

After discussion of this distinction, the user requested implementation with “Couldn’t paste screenshot—try again.” feedback and real-world testing. Implement the A1-only image-only acquisition policy and fail without fallback when a read or supplied-file preparation fails. A successful read of an unrelated host image remains indistinguishable from a valid local read; the retry message cannot detect that case. If the original absolute safety guarantee becomes mandatory again, an attachment-bound read capability or viewer-supplied image content would be needed. Do not disguise that conflict as a locality heuristic, a successful test, a missing setting, or a Herdr defect.

## Validation and physical acceptance

For implementation: typecheck, strict change validation, and only exact changed/owning clipboard, shell/chip, helper, and emitted-package test files. No directory-wide suite, preflight, `test:fast`, `test:full`, or `test:release` is selected.

Physical acceptance is unperformed. Record exact A1 candidate/build and installed Herdr versions, then exercise local Herdr and native-terminal screenshot paste, remote Herdr screenshot paste with actual image bytes on submission, and selection-autocopy/explicit-copy text flows in both machine directions. Source tests and clipboard mocks cannot establish installed-binary behavior or viewer locality. The task checkout has been built with the implementation. Launch it using the documented `scripts/dev` workflow; the final handoff identifies the exact candidate. Existing installed/running A1 and Herdr versions have not been version-matched to that build.
