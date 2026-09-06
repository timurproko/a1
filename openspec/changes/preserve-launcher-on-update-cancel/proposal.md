## Why

Cancelling `a1 update --develop` while npm was replacing the global package removed `a1`, `a1.cmd`, and `a1.ps1`, leaving a valid immutable release and update journal but no command through which recovery could run. The existing interruption contract is therefore incomplete: recovery is not usable unless the public launcher itself survives or is restored automatically.

## What Changes

- Make ordinary user cancellation a coordinated update request rather than an uncontrolled signal delivered into npm's destructive global-replacement window.
- Preserve a verified recovery capsule before package replacement and use an independently surviving recovery guardian to restore a callable launcher after updater, terminal, or npm failure.
- Require every completed, failed, or acknowledged-cancelled update attempt to leave the platform's complete public launcher set callable and bound to either the prior verified release or the installed target.
- Keep the durable update journal resumable so the next `a1` invocation converges to one verified active or rollback cohort without manual `npm install`, state deletion, or launcher reconstruction.
- Add exact-package fault coverage for cancellation and process loss at launcher-removal, package-replacement, launcher-creation, materialization, activation, and cleanup boundaries on Windows and Unix.
- Exclude a permanent separately published launcher and machine-power-loss/reboot recovery from this change; those require a broader packaging architecture.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `a1-shell`: Strengthen interrupted-update behavior so the public `a1` launcher remains or becomes automatically callable after cancellation and process failure.
- `cli-self-update`: Define cancellation shielding, recovery-capsule authority, launcher restoration, and safe transaction continuation around npm global replacement.
- `isolated-regression-testing`: Require exact-package cancellation and process-loss injection at the physical global-launcher boundary.

## Impact

- Affects the self-update process runner, signal handling, update transaction schema/recovery, global npm launcher discovery, detached helper lifecycle, immutable release selection, and update diagnostics.
- Adds A1-owned recovery evidence and a small packaged recovery entry point beneath managed storage; it does not add a second public command or package.
- Requires platform-specific handling for the POSIX launcher and Windows shell, command, and PowerShell launchers.
- Preserves existing sessions and immutable releases and does not require deleting control state or reinstalling A1 manually.
