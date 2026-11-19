## REMOVED Requirements

### Requirement: Exact packages carry a spawn-capable native process guardian
**Reason**: Releases no longer carry a native executable; the process guardian is a Node-API addon loaded in-process, so executable file modes carry no meaning for it.
**Migration**: Exact package surface validation loads each bundled platform's addon manifest and, on the lane's own platform, loads the addon itself; the executable-mode repair script is deleted.

## ADDED Requirements

### Requirement: Exact packages carry loadable native addons
The exact packed package SHALL record, for every bundled platform, the process-guardian addon and the terminal-host addon with their manifests, and SHALL carry no executable built from A1 sources. Each manifest SHALL bind the addon bytes by digest and size, name the Node-API version, and declare supported or unsupported capability independently. Exact package surface validation SHALL verify every bundled manifest and SHALL load the lane's own platform addon and observe its version identity on every lane that runs it. Posix installation and immutable release materialization SHALL preserve the addon bytes without depending on executable permission.

#### Scenario: Surface validation loads the lane's addon
- **WHEN** exact package surface validation runs on any platform lane, including Windows
- **THEN** it SHALL load that platform's packed process-guardian and terminal-host addons and SHALL fail unless each reports its recorded identity

#### Scenario: Package carries an executable
- **WHEN** a packed candidate contains an executable under `dist/native`
- **THEN** native artifact verification SHALL fail before `npm pack`

#### Scenario: Addon artifact remains unsupported
- **WHEN** a bundled addon loads but its certified manifest declares the current platform unsupported
- **THEN** launch SHALL continue to reject that containment provider until a separate platform-capability change certifies it

## MODIFIED Requirements

### Requirement: Validation candidates carry the lane's release terminal host
Every pull-request validation lane whose selected scopes consume a packed candidate, and every Full regression job that packs one, SHALL build the release terminal-host addon for its own platform into `dist/native` after installation and before recording the build receipt. On CI, validation packing SHALL fail before `npm pack` when the candidate lacks the platform's verified process-guardian addon or terminal-host addon, naming each problem.

#### Scenario: A pull request changes resident launch routing
- **WHEN** pull-request validation runs packaged suites for the change
- **THEN** the packed candidate SHALL carry the release terminal-host addon and its role entry, and packaged launches SHALL take the route a published package takes

#### Scenario: A lane packs without the host
- **WHEN** a CI lane reaches validation packing without this platform's terminal-host addon
- **THEN** packing SHALL fail before `npm pack` and SHALL name the missing artifact

### Requirement: macOS x64 release artifacts are cross-compiled
The publication build for the macOS x64 release terminal-host addon and process-guardian addon SHALL run on the macOS arm64 runner by compiling for the `x86_64-apple-darwin` target, placing the artifacts under the `darwin-x64` platform directory with a manifest, notices, and Zig target derived from the requested target rather than the host. The built addon's identity SHALL be verified on the producing runner by loading it into a Node runtime of that architecture (through Rosetta 2), or by its Mach-O architecture when the runner cannot load it, and the manifest SHALL record which check was performed. Packing SHALL continue to require every supported platform's artifact and manifest. The published-pair smoke matrix is unchanged; it has no macOS x64 lane, so a macOS x64 artifact is loaded in CI only through that identity check.

#### Scenario: Publication builds native artifacts
- **WHEN** a nightly, candidate, or development publication builds its terminal hosts and guardians
- **THEN** the macOS arm64 job SHALL produce both the `darwin-arm64` and `darwin-x64` addons, each with a manifest naming its own target
- **AND** no Intel macOS build job SHALL be scheduled

#### Scenario: Cross-compiled identity cannot be executed
- **WHEN** the producing runner cannot load the `x86_64` addon
- **THEN** the build SHALL verify the artifact's Mach-O architecture and SHALL NOT report a native identity it did not observe
