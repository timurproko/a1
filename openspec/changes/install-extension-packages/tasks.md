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
- [x] 2.3 Translate Pi's progress and failures into structured port results, so the
  A1 command process retains output ownership without delegating to Pi's exiting
  command handler
- [x] 2.4 Cover install, remove, update, and list against a temporary profile root in
  `test/foundation/pi-engine-adapter`, asserting the settings entry and installed
  content land under that root and nowhere else

## 3. Extend the command surface

- [x] 3.1 Parse `pi install`, `pi remove`, `pi uninstall`, and `pi list` in
  `src/cli/dispatch.ts`, while retaining bare `a1 pi` as the prerelease oracle launch
- [x] 3.2 Parse extension package updates under `pi update`, retain top-level
  `update --models` and the `self` alias, and refuse a pinned-Pi update
- [x] 3.3 Resolve the A1 profile root through the launch feature's existing path
  resolution and initialize it before use
- [x] 3.4 Wire a package handler in `bin/cli.js` beside launch, version, and update,
  so the CLI owner keeps no Pi import
- [x] 3.5 Render a CLI-owned confirmation for each completed package operation
- [x] 3.6 Extend the usage text with the new forms
- [x] 3.7 Cover the parse table in `test/cli`, including the `uninstall` alias, the
  refused `update pi`, and a rejected profile argument

## 4. Document it

- [x] 4.1 Add the package commands to the README command list, in the same shape as
  the existing entries

## 5. Restore pinned Pi transcript parity

- [x] 5.1 Add transcript fixtures for install, remove/uninstall, populated and empty
  list, update-all, update-one, not-found, and package-manager failure, including
  stdout/stderr routing and ANSI emphasis
- [x] 5.2 Render package progress dim and render outcomes with pinned Pi's exact
  wording, punctuation, indentation, filtered marker, and bold/green/red/dim roles
- [x] 5.3 Remove A1's package-result wrapper text, profile suffixes, renamed list
  labels, and post-install restart advisory
- [x] 5.4 Preserve npm/git child output in its original position and verify that
  operation-specific values such as package counts and timing are not normalized
  or rewritten
- [x] 5.5 Keep syntax errors in the `a1 pi` command namespace while matching pinned
  Pi's operational error lines after dispatch accepts a command

## 6. Validate and integrate

- [ ] 6.1 Let CI run the focused package-command, adapter, architecture, type, and
  strict OpenSpec validation suites
- [ ] 6.2 Open the implementation pull request and read its CI result
- [ ] 6.3 Record manual acceptance by comparing `pi` and `a1 pi` install, list,
  update-all, update-one, and uninstall transcripts in the same terminal; confirm
  wording, line order, indentation, and colors match while paths remain isolated to
  their respective profile roots
- [ ] 6.4 Restart and confirm the installed extension loads for bare `a1` and not for
  `a1 pi` or `a1 sandbox`, then archive the change
