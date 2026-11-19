## Context

The two public executable names map to `bin/addone.js`, which currently imports presentation and supervisor modules and starts the interactive runtime unconditionally. AddOne is distributed by npm as `@timurproko/addone`, has an npm-only toolchain contract, and already requires supported Node versions. See `proposal.md` and `specs/cli-self-update/spec.md` for motivation and observable behavior.

## Goals / Non-Goals

**Goals:**
- Dispatch `update` before loading or starting interactive-runtime modules.
- Keep registry and global-prefix selection under the user's existing npm configuration.
- Make command execution safe across Windows and Unix and straightforward to test hermetically.
- Reuse Pi's proven Windows command-shim handling while keeping added dependencies minimal, exact, and non-deprecated.

**Non-Goals:**
- Updating local Git checkouts, npm-linked development trees, Node.js, npm itself, Pi, or child-agent commands.
- Elevating privileges, bypassing npm policy, selecting prerelease channels, or implementing a second package manager.
- Hot-restarting an already running UI or supervisor into newly installed code.

## Decisions

### Dispatch before interactive imports

The bin entry point will inspect CLI arguments before importing UI/supervisor modules. Update logic will live in a small separately testable module and be loaded dynamically only for `update`. This avoids native PTY/TUI initialization and guarantees the update path cannot accidentally attach to or create a supervisor.

An alternative was to add update handling inside the TUI. That would make a non-interactive maintenance operation depend on terminal rendering and supervisor startup, violating isolation and complicating automation.

### Resolve latest, validate ownership, then install the exact version

The updater will ask npm for the version behind `@timurproko/addone@latest` and compare it to the running package with the exact `semver` dependency. Equal or older registry versions exit successfully without mutation. Before an upgrade, the updater resolves `npm root --global`, canonicalizes both paths, and verifies that the running package is contained by that root. Local checkouts, npm links resolving outside the global root, and installations owned by another package-manager context are refused with a manual command.

An eligible update invokes a global install of the exact resolved version rather than resolving `latest` again. This provides clear current/target output and keeps one consistent target throughout the operation. An unconditional `npm install --global ...@latest` was rejected because it can downgrade development builds, cannot accurately report current state, and performs unnecessary writes. A custom HTTP registry client was rejected because it would duplicate npm authentication, registry, proxy, certificate, and dist-tag behavior.

### Use Pi's cross-platform process strategy

Add exact `cross-spawn` and `semver` runtime dependencies and their exact type packages. Use `cross-spawn` with command `npm` on Windows so `.cmd` shim resolution and argument escaping match Pi's proven implementation; use Node's native `spawn` elsewhere. Every call passes an argument array and never constructs a command string. Registry and root queries capture stdout while preserving stderr diagnostics; installation inherits standard streams so npm progress and errors remain visible. Spawn failures and nonzero exits become unsuccessful AddOne results and print the exact manual fallback command.

Native Node spawning of either `npm` or `npm.cmd` was rejected on Windows because it fails with `ENOENT` or `EINVAL`. `shell: true` was rejected because it delegates quoting to an interpolated shell command. npm remains the external package manager because it is already the declared toolchain and accompanies supported Node installations; `cross-spawn` is only the portable process launcher.

### Avoid Pi's Windows native-addon quarantine through early dispatch

Pi quarantines loaded native addons before Windows self-update because its package command is reached after broad static imports. AddOne will instead dispatch `update` before dynamically importing any UI, supervisor, PTY, or agent module. Since `node-pty` is never loaded in the updater process, npm can replace the package without a native-addon quarantine. Normal interactive launch dynamically imports the existing modules after command dispatch.

### Test through dependency injection

The orchestration module will accept an injectable cross-platform process runner, filesystem canonicalizer, and output sink. Unit tests will model managed and unmanaged package roots, older/current/newer versions, malformed output, lookup failure, spawn failure, and installation failure while asserting exact executable/argument vectors. CLI-level hermetic tests will place fake platform npm shims on an isolated `PATH` and ensure both aliases dispatch without importing the native or interactive runtime. No test may access the registry or modify a global npm prefix.

## Risks / Trade-offs

- [A global installation may require elevated filesystem permissions] → Preserve npm diagnostics, return failure, and document that users must configure a writable npm prefix or run with appropriate platform permissions.
- [The executable currently running is not globally installed, such as an npm link or checkout] → Refuse automatic replacement after canonical global-root validation and print the exact manual global installation command.
- [The registry dist-tag can change after resolution] → Install the exact version returned by the initial lookup.
- [Replacing package files while the updater process is still running can be platform-sensitive] → Dispatch before native/runtime imports, wait for npm completion, and instruct users to start a new AddOne process afterward.
- [`cross-spawn` and `semver` expand the dependency graph] → Pin exact versions and require the lockfile-plus-registry zero-deprecation gate before packaging or publishing.
- [A supervisor may continue running code from the previous release] → Do not stop user workloads automatically; document that the update affects newly started processes and that existing supervised work should be stopped deliberately when appropriate.

## Migration Plan

Ship the subcommand in the next publishable AddOne patch release after all hermetic and release gates pass. Existing launch behavior without `update` remains unchanged. Rollback consists of globally installing an earlier explicit npm version; no data migration is introduced.
