## 1. Activation contract

- [x] 1.1 Add `src/foundation/release/update-activation.ts` with the contract constants, `activateInstalledRelease` (the activation body moved out of `update.ts`), `readActivationContracts`, `delegateActivation` (spawn the entry, decode its frames, relay callbacks in order, fail on `failed`, non-zero exit, or a missing `completed`), and `runActivationEntry`.
- [x] 1.2 Add `bin/activate.js`, declare `"updateActivationContracts": ["activate-v1"]` in `package.json`, list the entry in the runtime payload inventory and the packed-surface expectation, and export the module from the release index.
- [x] 1.3 Make `activateInstalled` read the installed manifest and delegate when it serves a known contract, otherwise activate in-process.

## 2. Proof

- [x] 2.1 Test delegation against a fake tree with no warmup or supervisor entry (phases, copy progress, warmup states relayed; in-process steps untouched), the three failure shapes, and the in-process fallback for a missing, unknown, or malformed field; test the entry body's event sequence, failure reporting, and argument validation.
- [x] 2.2 Add the governance test that pins the updater's knowledge of the installed tree to the manifest and the entry.
- [x] 2.3 Run a real delegated activation of the built tree into a sandbox and record the phase timings in the design evidence.

## 3. Specification and documentation

- [x] 3.1 Apply the `cli-self-update` delta and describe the activation handoff next to the launch handoff in `docs/architecture/internal-naming.md`.
