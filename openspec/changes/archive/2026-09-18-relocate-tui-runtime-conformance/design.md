# Design

## Test support, not a script entry

The plan left the choice between `test/support/` and a `scripts/pi/` entry to the upgrade driver. The driver (#489) runs the engine conformance script because the candidate evaluator needs a verdict on the public agent runtime from `dist/` before the tree is touched; the TUI probe exercises A1's own adapter against fakes, not the installed package, so it proves nothing about a candidate that the parity suites do not already prove. It stays a Vitest fixture: same code, same three assertions, imported from `test/support/` like the other rendering fixtures.

## Public entry as the seam

The probe imported `./contracts.js` and `./adapter.js` as siblings. From `test/support/` it imports `PiTuiRuntimeAdapter`, `PiTuiRuntimeError`, and the two port types from `src/integrations/pi/tui-runtime/index.js`, which already exports them, so no new export is added to the owner and the boundary check sees one public-entry import.
