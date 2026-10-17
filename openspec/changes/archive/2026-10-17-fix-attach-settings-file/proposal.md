# Proposal

## Why

Bare `a1` stops with `a1-terminal-host: prepare --settings-file: Cannot create a file when that file already exists. (os error 183)` on every profile that already has a settings document. The attach role handles `--settings-file` with the helper meant for directory arguments, which creates the path as a directory first. An existing `settings.json` makes that fail on Windows; on a profile without one it leaves an empty directory named `settings.json` that blocks A1 from saving settings. Role fixtures passed a settings path that did not exist yet, so CI never exercised the real case.

## What Changes

- Resolve `--settings-file` as a read-only file path: never create it, accept it whether or not it exists, and let the time-format reader keep its existing fallback.
- Run every attach role fixture against an existing settings document and assert that attach leaves it a regular file.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `resident-terminal-host`: the attach client reads the profile settings document without creating or replacing it.

## Impact

- **Native terminal host:** the attach argument parser in `native/terminal-host/src/main.rs` and the role fixtures in `native/terminal-host/tests/role_integration.rs`.
- No protocol, setting, registry, or command change.
