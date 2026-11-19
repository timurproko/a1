# Design

## Two edge sets from one scan

Cycle detection uses every relative `import`/`export ... from` statement including type-only ones: a type cycle is harmless at runtime but is the same layering defect (the release cycle's back edge is `import type { UpdateChannel } from "./update.js"`), and counting it matches the measurement the remediation plan was made against. Reachability uses runtime edges only, the same `runtimeRelativeImports` the startup-graph policy already applies (type imports skipped), plus dynamic `import("./x.js")` and every `./x.js` or `./x.ts` literal inside a `new URL(..., import.meta.url)` expression, which is how the paste and copy helpers are forked. A module only type-imported is therefore unreachable, which is correct: nothing loads it.

## Entry set

Roots are collected, not hand-listed: each `../dist/<path>.js` string in `bin/*.js` maps to `src/<path>.ts`, `package.json` `bin` and `exports` values map the same way, and `STARTUP_ROOTS` from `startup-graph-policy.mjs` are added. The four modules that are executed as their own process or worker (`session-ui/paste-helper.ts`, `session-ui/response-copy-helper.ts`, `session-ui/paste-text-worker.ts`, `engine/public-main-entry.ts`) are declared under `entryModules` in the allowlist because nothing imports them; the gate requires each declared entry to exist and to be otherwise unreachable, so a declared entry that gains an importer is reported as stale. `index.ts` files are exempt from reachability: owner barrels are required by the ownership policy whether or not production imports them.

## Allowlist that can only shrink

`config/architecture-allowlist.json` holds `importCycles` (each a sorted array of paths) and `unreachableModules`. A cycle is matched by exact member set; an unreachable module by path. Anything found and not listed fails with the cycle members or the module path; anything listed and not found fails as stale, so removing dead code or breaking a cycle must also edit the list, and the list never approves a future regression that happens to reuse a name. The stale-path gate from the previous change already covers deleted files.

## Placement

`inspectModuleGraph(root, allowlist)` lives in `scripts/governance/module-graph-policy.mjs` and returns error strings like the other policies; `check-architecture.mjs` reads the allowlist and appends the result only for the real repository (`--root` fixtures do not carry the allowlist). Tarjan's algorithm is iterative so a deep chain cannot overflow the stack.
