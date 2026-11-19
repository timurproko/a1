## Why

On a fresh Mac with Node.js from the default nodejs.org installer, `npm x -y -- @timurproko/a1-install` and its `--develop` form cannot install A1. npm's global prefix is root-owned (`/usr/local/lib/node_modules` and `/usr/local/bin`), so the global install stops with `EACCES` and the installer reports `installation failed: permission was denied`. Linux distribution Node.js has the same layout. The only workarounds are reconfiguring npm or using `sudo`, and a root-owned installation then cannot update itself. Even with a writable folder outside the shell's PATH, the installer's final check fails with `the installed command is not active in this shell`, because a child process cannot change its parent shell's PATH.

## What Changes

- When npm's active global prefix is not writable on macOS or Linux, install into the per-user npm prefix `~/.local` (`~/.local/bin/a1`, `~/.local/lib/node_modules/@timurproko/a1`) with an explicit `--prefix`, without changing npm configuration and without `sudo`.
- Make the per-user `bin` directory reachable: when it is not already on PATH, append one marked, idempotent PATH line to the user's login-shell startup file for zsh, bash, or fish.
- Report success with `a1 successfully installed; open a new terminal to use it` when the installation is complete but the invoking shell cannot resolve `a1` yet. Keep `a1 successfully installed` when it can.
- Detect an existing A1 installation in the per-user prefix on rerun and delegate to its cancellation-safe updater, as for the default prefix.
- Let `a1 update` and update recovery accept Unix launchers that npm creates as symlinks when they resolve canonically to the installed package's `bin/cli.js`, matching the installer's existing launcher rule, so the per-user installation updates itself.

## Capabilities

### Modified Capabilities

- `silent-installer`: installation falls back to a per-user prefix when npm's global prefix is not writable, activates PATH for future shells, reports the new-terminal success line, and recognizes an existing per-user installation.
- `cli-self-update`: a confirmed non-default prefix with a Unix symlink launcher that resolves to the running package is a managed installation.

## Impact

- `packages/a1-install` installation, launcher verification, command resolution, and output; `src/foundation/release/update.ts` installation ownership; `bin/update-recovery.js` and `src/foundation/release/update-recovery.ts` launcher callability; their tests.
- No change on Windows, where npm's global prefix is already per-user, or for Homebrew, nvm, fnm, or Volta Node.js, whose prefixes are writable. Existing installations under the default prefix keep their current paths.
- Shipping requires a stable release so the default `latest` installer used by both documented commands contains this change and the Node.js range fix from #855.
