# Image-file chip implementation evidence

## Delivered behavior

- The isolated paste helper retains only the source basename for a classified single supported image file, through both acquisition and prepared output. Clipboard image bytes carry no filename metadata. Parent IPC validates the bounded filename metadata, and payload-free diagnostics do not receive it.
- Prepared file images display `[🖼 filename.png #hexid]`, with `-resized` when transformed. The independent short identifier keeps different same-name images and repeated pastes distinct without overwriting their bytes or durable sidecars. Filename delimiters and terminal controls are sanitized, and labels are bounded.
- File-image reservations stay hidden during preparation instead of flashing screenshot labels. Clipboard screenshot reservations and final screenshot labels remain unchanged.
- Both routes retain actual image attachments, serialized preparation, validation, count policy, atomic editing, exactly-once submission, copy behavior, and undo/redo. Count-rejected file images retain dimmable filename-bearing labels without a usable payload; conversion failures remain recoverable and unsendable.
- One shared contract extracts durable identities for named images and legacy screenshot chips. History collection, reopen, pruning, fresh chip-store rehydration, and missing-payload stripping retain named attachments without changing ordinary file-reference behavior.

## Focused automated results

- `npm run build` passed; source and emitted helper coverage uses the built checkout.
- `npm run typecheck` passed after building the fresh checkout. The first invocation before build failed only because bin typechecking imports absent emitted declarations.
- Strict OpenSpec validation, architecture boundaries and identity/source-ledger checks, code-documentation governance, final delivery-body validation, and `git diff --check` passed. Fresh `origin/develop` was already an ancestor; no reconciliation merge was needed.
- 112 tests passed across these eight exact owning files: `image-prompt-chips.test.ts` under contracts, `herdr-image-files.test.ts`, `paste-chip-lifecycle.test.ts`, `prompt-chips.test.ts`, `paste-executor.test.ts`, and `paste-preparation-client.test.ts` under session-shell, plus `image-sidecar.test.ts` and `store.test.ts` under prompt-history.
- The first focused run found a new test expecting the wrong established conversion error wording. Its expectation was corrected to the existing exact diagnostic; no production assertion, deadline, or safety check was weakened.
- Architecture validation caught the existing executor function size ratchet after adding metadata checks. Extracting phase/header validation into private protocol predicates preserved the size boundary without changing thresholds.

Coverage includes quoted/spaced/uppercase-extension file paths, unchanged clipboard-image output, source/emitted file metadata, exact submitted bytes, zero native reads for supplied images, invalid/MIME/source/pixel rejection, vanished files, cancellation, two rapid pastes, different same-name files, later typing, undo/redo, atomic ranges, named count/failure chips, resized labels, sanitized filenames, duplicate attachment delivery, legacy screenshot identities, and durable sidecar retention/reaping.

## Limitations and disposition

Physical desktop dragging was not performed; production-shell terminal-input fixtures cover the actual supplied-path pipeline without claiming GUI certification. The built checkout can be launched for optional maintainer testing. Multiple/mixed path lists keep the approved existing behavior rather than becoming a new multi-file importer. No unresolved implementation defects are known within scope. No merge or installed-runtime replacement was performed; trusted automation owns readiness and finalization.
