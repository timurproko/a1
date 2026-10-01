## 1. Establish the resolver boundary

- [x] 1.1 Map npm command execution, active-global-root resolution, recovery-capsule creation, worker validation, and rollback timing; verify npm acquisition remains separate from the confirmed A1 destination prefix.
- [x] 1.2 Add failing deterministic coverage for direct Windows invocation with no `npm_execpath`, a user-scoped global root, and npm bundled under a separate Node installation; add a no-candidate case that fails before guardian or package mutation.

## 2. Resolve Node-bundled npm safely

- [x] 2.1 Implement bounded, platform-aware npm-entry candidate construction that preserves `npm_execpath` and active-root precedence and adds the fixed Windows Node-bundled layout from active command/current Node context.
- [x] 2.2 Canonicalize and require a regular file for every selected entry; verify missing files, directories, malformed PATH/PATHEXT values, and unrelated wrappers fail closed rather than broadening recovery authority.
- [x] 2.3 Record the selected canonical entry in the unchanged recovery capsule while retaining the current Node executable, exact target, explicit selected prefix, launcher set, and digest checks.

## 3. Validate protected replacement

- [x] 3.1 Run focused recovery, self-update, transition, process-settlement, and rollback tests; verify cancellation, updater loss, launcher restoration, and prior-release rollback remain unchanged.
- [x] 3.2 Run build, source/bin typecheck, architecture boundaries, product-identity governance, strict OpenSpec validation, and diff checks.
- [x] 3.3 Run representative exact-package validation on Windows and the focused package-install workload; verify direct invocation does not rely on npm lifecycle environment variables.
- [ ] 3.4 Publish a development candidate and complete the reported `a1 update --develop` from the roaming-prefix installation without injecting `npm_execpath`; record the resulting target and recovery outcome as acceptance evidence.
