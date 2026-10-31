## Context

`runInstaller` asks active npm for its global root, then runs `npm install --global` into it and requires the final `a1` command to resolve through the invoking shell's PATH. Node.js from the nodejs.org macOS package sets npm's prefix to `/usr/local`, whose `lib/node_modules` and `bin` are owned by `root`. Linux distribution packages behave the same. Windows uses the per-user `%APPDATA%\npm`, and Homebrew, nvm, fnm, and Volta use user-owned prefixes, so only root-owned prefixes fail. Observed on macOS 26 with Node.js 26.13.0: npm stopped with `EACCES` on `mkdir /usr/local/lib/node_modules/@timurproko`, and the installer printed `installation failed: permission was denied`.

The silent-installer requirements forbid persistent npm configuration changes. `a1 update` already updates an installation under a non-default prefix: it infers the prefix from the running package's `lib/node_modules` layout, confirms it with `npm root --global --prefix`, and pins replacement to it. Its ownership check, and update recovery's launcher callability check, accept only regular-file launchers containing the package entry. npm creates the Unix launcher as a symlink. The installer already accepts a symlink that canonically resolves to the package's `bin/cli.js`.

Pi's official installer (`https://pi.dev/install.sh`) solves the same problem the same way. It uses npm's global prefix only when `<prefix>/lib/node_modules` and `<prefix>/bin` are writable or creatable. Otherwise it installs with `--prefix "$HOME/.local"`, unless an existing command in the unwritable prefix would shadow the new copy, in which case it stops. It offers to append an exact, deduplicated PATH line to the current shell's startup file.

## Goals / Non-Goals

**Goals:** Both documented commands install a usable, self-updating A1 on a fresh macOS or Linux machine with a root-owned npm prefix, without `sudo` or npm configuration changes. Future shells resolve `a1` without manual PATH edits. Reruns update the per-user installation.

**Non-Goals:** Installing Node.js, changing Windows behavior, migrating existing default-prefix installations, a standalone (non-npm) installer, or handing a stale stable installer off to the development installer.

## Decisions

- **Per-user prefix `~/.local`.** It yields `~/.local/lib/node_modules/@timurproko/a1` and `~/.local/bin/a1`, the conventional per-user layout already accepted by `npmPrefixForGlobalRoot`, matches Pi, and is already on PATH in many Linux and some macOS shells. A product-private folder such as `~/.a1/npm` would always need a PATH edit and is not shared with Pi's established choice. Every npm mutation uses an explicit `--prefix`, and no npmrc or environment value persists.
- **Choose the prefix before mutation.** Use active npm's prefix when `<prefix>/lib/node_modules` and `<prefix>/bin` are writable or creatable; otherwise, on macOS and Linux only, use `~/.local`. If `a1` already exists in the unwritable prefix's `bin`, fail with an actionable result instead of creating a second copy that the old one would shadow. Windows keeps the current path.
- **Existing per-user installation.** When the active global root has no A1 but `~/.local` holds a verified A1 package and launcher, delegate to that installation's updater exactly as for the default prefix. Ownership verification is unchanged apart from the launcher rule below.
- **PATH activation.** If `~/.local/bin` is not on the invoking PATH, append one exact line to the login shell's startup file: `~/.zshrc` (honoring `ZDOTDIR`) for zsh, `~/.bashrc` when present or else `~/.profile` for bash, `~/.config/fish/config.fish` for fish (`fish_add_path`), and `~/.profile` otherwise. Skip the write when the file already contains the line. The line is preceded by an `# a1` marker comment so it is identifiable. No other file content is modified.
- **Verification and success.** Command resolution runs against the invoking PATH with the per-user `bin` prepended when the line was written or already present. When the invoking shell itself resolves the installed launcher, print `a1 successfully installed`. When only future shells will resolve it, print `a1 successfully installed; open a new terminal to use it`. Normal output still discloses no paths. A foreign or stale `a1` earlier on PATH still fails with `another command takes precedence`.
- **Symlink launchers in update.** In `launchersOwnPackage` and recovery's `installedTargetIsCallable`, accept a Unix launcher that is a symlink whose canonical target equals the canonical package `bin/cli.js`, mirroring `verifyLaunchers` in the installer. Regular-file launchers keep their content check. Recovery-written launchers remain regular files. Any other symlink target is still unmanaged.

## Risks / Trade-offs

- Editing a shell startup file is user-visible. Mitigation: one marked line, append-only, deduplicated, written only when the per-user `bin` is missing from PATH, and never for the writable-prefix path. Pi prompts before writing; A1's installer is non-interactive by contract, so it writes without prompting and keeps the file name out of normal output. Open question for review: prompt like Pi when a terminal is attached.
- `~/.local/lib/node_modules` may hold other per-user npm packages. A1 only ever touches its own package and launcher there through npm with an explicit prefix.
- A user who later fixes npm's global prefix may end up with two installations. Command resolution reports the conflict instead of choosing silently.
- The default `latest` installer only gains this after a stable release; until then the documented commands keep failing on root-owned prefixes.

## Migration Plan

No data migration. Existing default-prefix installations keep their location and update path. Release this with the Node.js range fix in the next stable version so `npm x -y -- @timurproko/a1-install` uses it.
