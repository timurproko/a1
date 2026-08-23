## 1. Give A1 a vendor-neutral package contract

- [x] 1.1 Add an `AgentPackagesPort` to `agent-engine-contracts` covering install,
  remove, update, model-catalog refresh, and list against a resolved profile root,
  with results the CLI can render without knowing the vendor
- [x] 1.2 Cover the contract's shapes in `test/foundation/agent-engine-contracts`

## 2. Implement the port on the Pi boundary

- [x] 2.1 Implement the port in `pi-engine-adapter` over pinned Pi's public
  `DefaultPackageManager` and `SettingsManager`, taking the profile root as an
  argument rather than reading the configuration-root environment variable
- [x] 2.2 Do not delegate to Pi's own package command handler: it prints Pi's command
  names and exits the process, both of which A1 owns
- [x] 2.3 Translate Pi's progress and failures into port results, so nothing that
  reaches the terminal is written in Pi's voice
- [x] 2.4 Cover install, remove, update, and list against a temporary profile root in
  `test/foundation/pi-engine-adapter`, asserting the settings entry and installed
  content land under that root and nowhere else

## 3. Extend the command surface

- [x] 3.1 Parse `install`, `remove`, `uninstall`, and `list` in `src/cli/dispatch.ts`,
  and narrow the existing "commands take no further argument" rule to the launch forms
- [x] 3.2 Parse `update` with `--extensions`, `--models`, a positional source, and the
  `self` alias; refuse `pi` with the pinned-release explanation
- [x] 3.3 Resolve the A1 profile root through the launch feature's existing path
  resolution and initialize it before use
- [x] 3.4 Wire a package handler in `bin/cli.js` beside launch, version, and update,
  so the CLI owner keeps no Pi import
- [x] 3.5 Say on success that a running session needs a restart to load the change
- [x] 3.6 Extend the usage text with the new forms
- [x] 3.7 Cover the parse table in `test/cli`, including the `uninstall` alias, the
  refused `update pi`, and a rejected profile argument

## 4. Document it

- [x] 4.1 Add the package commands to the README command list, in the same shape as
  the existing entries

## 5. Validate and integrate

- [x] 5.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 5.2 Open the pull request and let CI validate
- [ ] 5.3 Record manual acceptance — install a published Pi extension, restart, and
  confirm it loads for bare `a1` and not for `a1 pi` or `a1 sandbox` — then archive
