# Tasks

## 1. Install without a writable npm prefix

- [ ] 1.1 Choose the installation prefix before mutation: active npm's prefix when its `lib/node_modules` and `bin` are writable or creatable, otherwise `~/.local` on macOS and Linux, failing actionably when an `a1` launcher already exists in the unwritable prefix.
- [ ] 1.2 Install, verify launchers, activate, and verify the package under the selected prefix with explicit `--prefix` arguments and no persistent npm configuration change.
- [ ] 1.3 Detect a verified existing A1 installation in `~/.local` when the active global root has none, and delegate to its cancellation-safe updater.

## 2. Activate the command for future shells

- [ ] 2.1 Append one marked, deduplicated PATH line for `~/.local/bin` to the zsh, bash, fish, or POSIX profile startup file only when the directory is not on PATH, leaving other content unchanged.
- [ ] 2.2 Verify command resolution with the activated PATH and print `a1 successfully installed; open a new terminal to use it` when only future shells resolve the launcher, keeping `a1 successfully installed` and the precedence failure otherwise.

## 3. Update the per-user installation

- [ ] 3.1 Accept a Unix launcher symlink whose canonical target is the package's `bin/cli.js` in update ownership and recovery callability checks, keeping regular-file content checks and rejecting other targets.

## 4. Cover the behavior

- [ ] 4.1 Add installer tests for a read-only global prefix, an existing shadowing launcher, each shell startup file and a deduplicated rerun, the new-terminal success line, and delegation to an existing per-user installation.
- [ ] 4.2 Add update tests for a per-user prefix with a symlinked launcher, including a rejected foreign symlink target and a recovery round trip.
