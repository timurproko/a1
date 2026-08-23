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

## 3. Validate and integrate

- [x] 3.1 `npm run typecheck` and `openspec validate --strict` pass
- [ ] 3.2 Open the pull request and let CI validate
- [ ] 3.3 Record manual acceptance — `a1 pi` beside vanilla `pi` shows the same
  model-pattern warnings and package-update notice — then archive
