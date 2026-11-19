## Why

The CLI tells users about internal delivery progress: "resource/maintenance delivery is pending", "not available yet
in this partial delivery of default Pi compatibility", "Default Pi parity is being delivered in stages" and
"the shared input transport is pending". Users need to know only that the input is not supported.

## What Changes

- The `config`, `auth` and `mcp` commands, unsupported Pi options and `@file` inputs fail with a plain
  "not supported" message.
- The interactive help states plainly that unlisted Pi options and oversized input are not supported.

## Impact

- `src/cli/dispatch.ts`, `src/cli/interactive-options.ts` and their tests.
- New capability spec `cli-unsupported-input`.
