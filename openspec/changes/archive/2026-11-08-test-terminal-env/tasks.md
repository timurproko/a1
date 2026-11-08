# Tasks

## 1. Neutral test terminal

- [x] 1.1 Add `test/support/terminal-environment.ts`, which removes the terminal-identity and capability-override variables, register it in `vitest.config.ts`, and add a guard test that the variables are absent and capability detection reports a neutral terminal.
