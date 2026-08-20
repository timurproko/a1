# Toolchain and release contract

Exact package versions are recorded in `package-lock.json`.

## Runtime and build

| Component | Contract |
|---|---|
| Node.js | `>=22.19.0 <25` |
| Package manager | npm 11, lockfile v3 |
| Language | TypeScript, strict native ESM, `NodeNext`, ES2023 |
| Control storage | Built-in `node:sqlite` `DatabaseSync`, WAL mode |
| Process/version helpers | `cross-spawn`, `semver` |
| Tests | Vitest |

The repository has one root package manifest, lockfile, dependency tree, TypeScript configuration, and test configuration. Feature folders must not introduce nested package installations or generated runtime state.

## Platform policy

Transparent launch uses inherited native terminal/process facilities on Windows, Linux, and macOS. The architecture is platform-neutral, but stable parity/support claims are platform-specific and require deferred physical certification against exact package bytes. An uncertified `next` preview is not evidence of stable cross-platform support.

Physical desktop automation is absent from the active repository baseline. Any future implementation must run only on dedicated disposable workers or VMs with exclusive interactive desktops and exact process ownership.

## Package contents

The published package contains:

- the sole public `a1` command;
- the internal supervisor entry;
- immutable release/bootstrap, lifecycle, protocol, storage, update, and transparent-launch modules;
- current user and architecture documentation.

It contains no PTY, terminal emulator, browser/desktop GUI, custom renderer, input translator, physical automation driver, or generated runtime data.

## Gates

```sh
npm run build
npm run typecheck
npm run check:architecture
npm run check:deprecated
npm test
npm run test:release
```

`check:deprecated` verifies the complete lockfile graph against registry metadata. The release gate exercises durable stable/preview update transitions and writes an ignored machine-readable verdict under `artifacts/release-verdicts/`.

## Preview publication

A preview candidate must use a unique `-dev.N` version and exact manually accepted bytes. Publication packs once, binds evidence to source commit/version/integrity, runs applicable non-desktop gates, publishes under npm `next`, and verifies registry identity. It must keep `latest` unchanged and record physical/cross-platform certification as deferred.

The GitHub trusted-publishing workflow is `.github/workflows/publish-next.yml`. Stable publication remains a separate release process from a clean tagged `master` commit after all mandatory platform gates pass.

## AddOne state paths

These paths are AddOne control and release state, not Pi profile roots. All are overrideable for hermetic tests.

| Purpose | Override | Windows default | Unix default |
|---|---|---|---|
| Config | `ADDONE_CONFIG_DIR` | `%APPDATA%\\AddOne` | `$XDG_CONFIG_HOME/addone` or `~/.config/addone` |
| Durable data | `ADDONE_DATA_DIR` | `%LOCALAPPDATA%\\AddOne` | `$XDG_DATA_HOME/addone` or `~/.local/share/addone` |
| Runtime | `ADDONE_RUNTIME_DIR` | `%LOCALAPPDATA%\\AddOne\\runtime` | `$XDG_RUNTIME_DIR/addone` or `<data>/runtime` |
| Database | `ADDONE_DATABASE_PATH` | `<data>/control.sqlite3` | `<data>/control.sqlite3` |
| Endpoint | `ADDONE_ENDPOINT` | runtime-scoped named pipe | `<runtime>/supervisor.sock` |

The launch-profile feature separately owns Pi roots: `~/.a1/agent`, ordinary `~/.pi/agent`, and `~/.a1/sandbox`.
