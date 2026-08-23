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

## Native launch containment

Source builds require Rust/Cargo 1.85 or newer. `npm run build` compiles the standalone `native/process-guardian` crate for the host platform, places it under `dist/native/<platform>-<architecture>/`, and writes an integrity manifest. Preview and stable candidate workflows build platform artifacts on isolated Windows, Linux, and macOS runners and assemble them before packing. macOS remains explicitly unsupported until its exact containment adapter is certified; the package must fail before runtime startup rather than use PID-only cleanup.

The process guardian inherits terminal handles but transports no terminal bytes. See [`process-guardian-provenance.md`](process-guardian-provenance.md).

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

## Pi maintenance workflows

Engine compatibility and presentation synchronization are intentionally separate:

```sh
npm run test:pi-engine-conformance
```

This mandatory candidate workflow checks documented package-root exports and the owned engine integration. It does not read private interactive source, compare source maps, regenerate UI fixtures, or require presentation provenance to match a candidate package.

```sh
npm run sync:pi-ui
```

This optional, mutating presentation-maintenance workflow regenerates component and event-frame parity evidence when maintainers deliberately adopt upstream UI changes. Review generated diffs, attribution, and source-ledger records before committing them. It is never an engine candidate acceptance gate and is not run by `check`, `prepack`, or release publication.

Presentation acceptance is the reader comparing `a1 pi` with pinned Pi. `node scripts/check-pinned-pi-source-ledger.mjs` validates accepted provenance; its `--engine-only` mode validates the ownership partition without comparing private upstream source.

## Publication

One workflow publishes both channels: `.github/workflows/release.yml`. A push to `develop` publishes a preview under npm `next` at a unique `-dev.N` version stamped at publish time; a pushed `v<version>` tag publishes that version under npm `latest` and records its GitHub Release. Both routes pack once, validate those exact bytes on Windows, Linux, and macOS, and publish with provenance from the `npm-publish` environment. The publisher never rebuilds and a preview never changes `latest`.

`docs/ci-release-runbook.md` is the operational reference.

## A1 state paths

These paths are A1 control and release state, not Pi profile roots. All are overrideable for hermetic tests.

| Purpose | Override | Windows default | Unix default |
|---|---|---|---|
| Config | `A1_CONFIG_DIR` | `%APPDATA%\\A1` | `$XDG_CONFIG_HOME/a1` or `~/.config/a1` |
| Durable data | `A1_DATA_DIR` | `%LOCALAPPDATA%\\A1` | `$XDG_DATA_HOME/a1` or `~/.local/share/a1` |
| Runtime | `A1_RUNTIME_DIR` | `%LOCALAPPDATA%\\A1\\runtime` | `$XDG_RUNTIME_DIR/a1` or `<data>/runtime` |
| Database | `A1_DATABASE_PATH` | `<data>/control.sqlite3` | `<data>/control.sqlite3` |
| Endpoint | `A1_ENDPOINT` | runtime-scoped `a1-*` named pipe | `<runtime>/supervisor.sock` |

### Identity hard cut and cleanup

A1 does not read or migrate legacy `ADDONE_*` variables, `AddOne`/`addone` control-state directories, release manifests, database schemas, endpoint records, or protocol frames. Remove obsolete control state only after stopping old processes: `%APPDATA%\\AddOne` and `%LOCALAPPDATA%\\AddOne` on Windows, or the former `addone` directories under XDG config, data, and runtime roots on Unix. This cleanup is manual and never imports data into A1.

Do **not** remove `~/.a1/agent` or `~/.a1/sandbox`; those are current Pi profile roots and are intentionally preserved. `~/.pi/agent` remains the vanilla Pi profile.

The obsolete npm package `@timurproko/addone` is deprecated with the registry message `This package is obsolete. Use @timurproko/a1 instead.` It is not a current identity, compatibility channel, or rollback source. Whole-package unpublication was rejected by npm policy; any later removal is owner-controlled registry administration and does not change the A1 runtime contract.

The launch-profile feature separately owns Pi roots: `~/.a1/agent`, ordinary `~/.pi/agent`, and `~/.a1/sandbox`.
