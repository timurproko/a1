# Design

## An app layer, not a fourth adapter

`src/app/session-shell` is the one owner that knows the whole interactive session: it takes the engine adapter, the component adapter, the TUI runtime, the UI components and apps, and the features, and wires them into `OwnedUiSessionShell`. That is application composition, so it sits beside `composition` in the layout rather than under `integrations/pi`, and its `mayImport` list says so. It imports no Pi package itself; the adapters still hold every `@earendil-works` import, which the layer check now verifies instead of assuming.

## Named exports

Expanding `export *` into named lists was done from the TypeScript checker's view of each module's exports, so the lists are exact and `export type` is used wherever the symbol has no value. One duplicate surfaced: the component adapter's entry re-exported three theme functions from the upstream module that `theme.ts` already re-exported; `export *` had silently dropped the ambiguous names, and the explicit line had restored them. The named list from `theme.ts` now carries them once.

## Why the startup exemption stays, narrowed

The plan asked for composition to be the only deep importer. `startup-graph-policy.mjs` forbids the owner barrels (`ui/components/index.ts`, the Pi adapter entries, `foundation/*/index.ts`) on the eager startup path, and marks `history-editor-loader.ts` as optional. Redirecting the session shell's leaf imports to those barrels grows the startup graph by 26 files and 95 KB and loads the optional loader eagerly. Both rules are product-facing (first-frame time), so the exemption is kept but stated: a startup module may import a leaf only of a provider whose entry is prohibited. Imports that do not qualify, such as the seven into `contracts/owned-ui`, go through the public entry.

## The impact selector under a directory move

`classifyRenderingImpact` kept every changed path, old and new, in the rendering record, and `assertValidationImpact` bounds that list at 256. A move of 130 files produces 260 identities and fails the selection before any test runs. The tier is still decided from every path; only the recorded list is sliced.
