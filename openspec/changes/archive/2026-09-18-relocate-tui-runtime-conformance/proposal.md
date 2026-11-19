## Why

`src/integrations/pi/tui-runtime/conformance.ts` is the last module on the architecture gate's unreachable-module allowlist. It builds a fake terminal and component, drives `PiTuiRuntimeAdapter` through start, differential render, input, overlay, resize, mode switch, and stop, and returns a report; its only consumer is `test/integrations/pi/tui-runtime/conformance.test.ts`. The engine conformance probe next to it became a `scripts/pi/` entry that the candidate evaluator and the upgrade driver run; the TUI probe never did, and the upgrade driver merged in #489 gates on engine conformance and the parity suites only. A production module that no entry point reaches is exactly what the owner requirement forbids, and the allowlist entry that excuses it has outlived its reason.

## What Changes

- Move the probe to `test/support/pi-tui-runtime-conformance.ts`, importing the adapter and ports from the `tui-runtime` public entry; the conformance test imports it from there.
- Drop `export * from "./conformance.js"` from `src/integrations/pi/tui-runtime/index.ts`.
- Empty `unreachableModules` in `config/architecture-allowlist.json`; the gate only lets the list shrink, so the exemption cannot return without a reviewed policy change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: a probe that only tests consume is test support, and the unreachable-module allowlist is empty.

## Impact

No runtime behavior changes: the module was not in the startup graph (152 files, 1,432,617 bytes before and after). The `tui-runtime` public entry no longer exports `runPiTuiRuntimeConformance` and its two types; nothing in `src/` used them.
