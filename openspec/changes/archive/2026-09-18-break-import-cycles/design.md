# Design

## Types move down, helpers move sideways

`UpdateChannel` is a two-member union used by the CLI dispatcher, the update command, and the transaction store; only the update command defined it, which made the store depend on its own caller. `DependencyLayerReference` is the reference shape the release reader embeds in a manifest and the dependency-layer module materializes; the reader defined a type the layer module owned. Both now live in `release/types.ts`, a leaf with no imports, and the original modules re-export them so `foundation/release/index.ts` exports the same names as before. The three endpoint helpers were endpoint code that happened to be written inside `bootstrap.ts`; `endpoints.ts` already owned the sweep that called them, so they move there with their private `requestIdentity` and `isStringArray` helpers and the imports they need (`connect`, `readFile`, `rm`, `platform`, the protocol framing, `PRODUCT_IDENTITY`). `bootstrap.ts` still imports `release-gc.ts`; the plan's stricter layering for bootstrap is a later change, and after this one there is no cycle for it to close.

## Paste types

`ClipboardPath` and `PreparedPasteText` are the classification result of `preparePasteText`; `path-chip-presentation.ts` renders that result and `paste-text-preparation.ts` calls the renderer, so each needed the other. The two types now live in `paste-types.ts` and `paste-text-preparation.ts` re-exports them for its existing consumers.

## The parser

`runtimeRelativeImports` matched `(import|export)\s+([\s\S]*?)\s+from\s+"./…"` with a lazy clause. For a bare-specifier import such as `import path from "node:path";` the lazy clause found no relative specifier on its own line and kept consuming into the next statement, so `import path from "node:path";\nimport type { X } from "./x.js";` yielded a single runtime import of `./x.js`. Bounding the clause with `[^;]*?` stops it at the terminator; multi-line clauses contain no `;` and still match. The module-graph policy's static scanner used the same lazy pattern and is bounded the same way. The corrected startup graph is smaller because `session-ui` and `engine` modules that were reached only through such misparsed `import type` lines drop out; the baseline is re-pinned to the exact new totals as the repository convention requires, and `features/launch/intent.ts`, no longer an eager leaf, imports the `lifecycle` barrel like any other non-startup module.
