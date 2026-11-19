## Why

`a1 update` is performed by the release that is already installed, against a tree that is newer than it. After npm replaces the global package, the running updater materializes, certifies, warms, and supervises that new tree in-process, and to do so it resolves `bin/warmup.js` and `bin/supervisor.js` inside a tree whose layout it cannot know. The removal of `bin/sync-pi-tui-proxy.js` in #479 showed the failure mode in its mild form: every installed updater kept running a file the new tree no longer shipped. A rename of the warmup or supervisor entry would show it in its severe form: every installed updater would fail to activate the new release. The only guard today is the predecessor gate, which proves the candidate still matches what old updaters expect; nothing lets a tree change its own layout.

## What Changes

- The installed tree activates itself. The package manifest declares `"updateActivationContracts": ["activate-v1"]`, and the tree ships `bin/activate.js`. An updater that finds a contract it serves in the newly installed manifest starts that entry with `--data-dir` and `--target-version` and relays its one-line JSON progress events (`materializing`, `phase`, `warmup`, `completed`, `failed`) into its own transaction journal and progress bar. The entry runs the tree's own release code; the updater knows two paths in the tree, `package.json` and `bin/activate.js`, and nothing else.
- A tree without the contract, or with only contracts the updater does not serve, is activated in-process exactly as today, so a downgrade to an older preview and an update driven by an updater older than this change keep working; the predecessor gate continues to prove that.
- A delegated activation that reports `failed`, exits non-zero, or exits without `completed` fails the update with the entry's own bounded reason, and the existing rollback handles it.
- A governance test keeps the updater ignorant of the tree: `update.ts` names no `bin/` path, the contract module names only the entry, and the entry loads only its own activation module.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: post-installation activation is performed by the installed release through a declared contract; the updater falls back to in-process activation only for a tree that declares no contract it serves.

## Impact

New `src/foundation/release/update-activation.ts` (the contract constants, `activateInstalledRelease`, `readActivationContracts`, `delegateActivation`, `runActivationEntry`) and `bin/activate.js`; `update.ts` moves its activation body there and chooses between delegation and in-process; `package.json` declares the contract; the runtime payload inventory and packed-surface expectation list the entry; `docs/architecture/internal-naming.md` describes the handoff. Not changed: the transaction journal and its phases, rollback, materialization, certification, warmup, supervision, the progress bar, or the predecessor gate.
