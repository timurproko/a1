## 1. Resolve the configured model scope at startup

- [x] 1.1 Resolve `enabledModels` patterns through the public
  `resolveModelScopeWithDiagnostics` API when the owned runtime is created,
  pass the scoped models and pinned initial-model choice into session
  creation, and return the resolver's warnings as runtime diagnostics
- [x] 1.2 Cover unmatched-pattern warnings and applied scope/initial model in
  the runtime integration tests

## 2. Run the startup package-update probe

- [x] 2.1 Probe extension-package updates through the public
  `DefaultPackageManager` after the adapter reaches ready, and surface found
  updates as a recoverable startup diagnostic naming the packages
- [x] 2.2 Keep the probe out of injected-runtime (test) adapters and make it
  injectable; cover the surfaced diagnostic in the adapter tests

## 3. Render both in pinned style and order

- [x] 3.1 Render startup diagnostics above the banner in pinned
  `reportDiagnostics` style (severity colour, `Warning: `/`Error: ` prefix,
  dim info) with no display cap
- [x] 3.2 Render found package updates as pinned Pi's bordered
  `Package Updates Available` banner after the banner and loaded resources
- [x] 3.3 Cover styling, order, and the uncapped warning list in the session
  shell tests

## 4. Validate and integrate

- [x] 4.1 `npm run typecheck` and `openspec validate --strict` pass
- [ ] 4.2 Open the pull request and let CI validate
- [ ] 4.3 Record manual acceptance — `a1 pi` beside vanilla `pi` shows the same
  model-pattern warnings and package-update notice, in the same style and
  order — then archive
