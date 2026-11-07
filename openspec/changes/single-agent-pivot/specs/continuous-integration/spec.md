## REMOVED Requirements

### Requirement: The native terminal host is validated in CI rather than on workstations
**Reason**: The native terminal host is removed; A1 ships no native code.

**Migration**: None. The Ghostty VT test, fuzz, fidelity, parity, and resident-progress steps are deleted from the workflows.

### Requirement: Published-pair lanes expose their native identity
**Reason**: There is no native artifact whose identity a lane could expose.

**Migration**: None.

### Requirement: Complete native validation distinguishes semantic failure from bounded fixture release
**Reason**: There is no native validation.

**Migration**: None.

### Requirement: Validation candidates carry the lane's release terminal host
**Reason**: Candidates carry no terminal host.

**Migration**: Exact-package lanes validate the pure JavaScript package.

### Requirement: Pull-request chaos runs use a shorter bounded budget
**Reason**: The resident chaos harness is removed with resident tabs.

**Migration**: None.

### Requirement: Native toolchains and caches are pinned and stable
**Reason**: There is no Rust or Zig toolchain to pin.

**Migration**: `rust-toolchain.toml`, `prepare-ci-rust.sh`, and the native cache steps are deleted.

### Requirement: Exact packages carry loadable native addons
**Reason**: Exact packages carry no addons.

**Migration**: Pack metadata tests assert the absence of `dist/native`.

### Requirement: Native assembly uses explicit complete and core build contracts
**Reason**: The build has one contract: TypeScript compilation plus resource generation.

**Migration**: `npm run build` and `npm run build:core` become equivalent; `build:terminal-host` and `build:process-guardian` are removed.

### Requirement: macOS release validation proves packaged supervision and containment
**Reason**: There is no supervisor or containment to prove.

**Migration**: The macOS exact-package lane validates launch, resume, and cleanup of the direct single-process UI.

### Requirement: macOS x64 release artifacts are cross-compiled
**Reason**: There are no native artifacts to compile for any target.

**Migration**: None.
