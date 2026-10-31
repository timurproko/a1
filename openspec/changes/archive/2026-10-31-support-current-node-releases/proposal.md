## Why

The installer and both package manifests cap Node.js below 25, so a user who takes the default current LTS download from nodejs.org (Node 26) cannot install A1. The installer then reports `installation failed: Node.js 22.19.0 or newer is required`, which is false for a newer runtime and offers no next step. Node 26 runs the published package: the CLI, built-in `node:sqlite`, and both Node-API 9 native addons load, and no dependency declares an upper Node bound.

## What Changes

- Accept every Node.js release from 22.19.0 onward in the installer and in the `engines` contract of the application and installer packages, with no upper major cap.
- Replace the too-old failure with one encouraging, actionable line that names the detected version and the minimum: `a1 needs a newer Node.js: you have v20.11.0, install 22.19 or later`.
- Align the toolchain documentation and environment-check tests with the open-ended range.

## Capabilities

### Modified Capabilities

- `silent-installer`: the installer accepts any Node.js 22.19.0 or later and reports an older runtime with a version-specific line outside the generic failure prefix.

## Impact

- `packages/a1-install` runtime gate, failure output, and manifest; root `package.json`/lockfile engines; toolchain docs; installer and environment-prerequisite tests.
- CI runtime lanes are unchanged; adding a Node 26 validation lane is a separate follow-up.
