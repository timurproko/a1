## ADDED Requirements

### Requirement: Installation succeeds when npm's global prefix is not writable
On macOS and Linux, before any installation mutation, the installer SHALL use active npm's global prefix only when that prefix's `lib/node_modules` and `bin` directories are writable or can be created by the invoking user. Otherwise it SHALL select the per-user prefix `~/.local` and SHALL perform every npm mutation, launcher verification, activation, and package verification against that prefix with an explicit `--prefix` argument. It SHALL NOT request elevated privileges or persistently change npm configuration. When an `a1` launcher already exists in the unwritable prefix's `bin`, the installer SHALL fail before mutation with the existing `another command takes precedence` result rather than install a second copy that the existing launcher would shadow. On Windows the installer SHALL keep using active npm's prefix.

When active npm's global root holds no A1 package and the per-user prefix holds a verified A1 package with its complete launcher set, the installer SHALL treat that installation as the existing installation and delegate to its cancellation-safe updater with the same target mapping and npm execution context as for the default prefix.

When the per-user `bin` directory is not on the invoking PATH, the installer SHALL make it available to future shells by appending exactly one PATH line, preceded by an `# a1` marker comment, to the startup file of the user's login shell: `$ZDOTDIR/.zshrc` or `~/.zshrc` for zsh, `~/.bashrc` when present and otherwise `~/.profile` for bash, `~/.config/fish/config.fish` using `fish_add_path` for fish, and `~/.profile` for other shells. It SHALL NOT write when that file already contains the exact line, SHALL NOT modify any other file content, and SHALL NOT write a startup file when the selected prefix is active npm's writable prefix.

#### Scenario: A fresh Mac has a root-owned npm prefix
- **WHEN** the installer runs on macOS with Node.js from the nodejs.org package, `/usr/local/lib/node_modules` and `/usr/local/bin` are not writable, and no `a1` launcher exists there
- **THEN** the installer SHALL install the exact target under `~/.local` with explicit prefix arguments and complete every existing verification there
- **AND** SHALL NOT use `sudo`, change npm configuration, or report `permission was denied`

#### Scenario: npm's global prefix is writable
- **WHEN** active npm's prefix `lib/node_modules` and `bin` are writable, as with Homebrew, nvm, fnm, Volta, or Windows Node.js
- **THEN** the installer SHALL install under that prefix as before and SHALL NOT write any shell startup file

#### Scenario: An existing global launcher would shadow the per-user copy
- **WHEN** npm's global prefix is not writable and its `bin` already contains an `a1` launcher
- **THEN** the installer SHALL fail before mutation with `installation failed: another command takes precedence` and no success text

#### Scenario: PATH is activated for future shells
- **WHEN** the per-user installation succeeds, the user's login shell is zsh, and `~/.local/bin` is not on the invoking PATH
- **THEN** `~/.zshrc` SHALL gain one `# a1` marker line and one `export PATH="$HOME/.local/bin:$PATH"` line
- **AND** a rerun SHALL not append the line again

#### Scenario: The per-user installation is rerun
- **WHEN** a later installer run finds no A1 under active npm's global root and a verified A1 installation under `~/.local`
- **THEN** the installer SHALL delegate to that installation's cancellation-safe updater rather than install another copy

## MODIFIED Requirements

### Requirement: Successful installation shows controlled progress and one success message
In an interactive terminal, the installer SHALL display one carriage-return progress row conforming exactly to A1 self-update's 38-cell bar width, glyphs, selected-profile semantic-accent completed segment, grey remaining track, grey percentage treatment, and style reset. The completed segment SHALL consume the dependency-free installer form of the same release-owned named A1 palette contract as self-update, byte-equivalent to the main-package form. It SHALL read only the effective global A1 profile's saved Accent color, defaulting to blue for fresh installations, missing profiles, and invalid or unreadable settings, without starting A1 or acquiring additional runtime dependencies. Progress SHALL be non-decreasing, SHALL use measured activation progress where available, and MAY creep toward but SHALL NOT render an unreached milestone during opaque npm work. The visible row SHALL end at the numeric `<percentage>%` treatment and SHALL contain no phase, status, package, or other wording after it. Every redraw SHALL erase terminal content to the right of the current frame so no suffix from an earlier longer row remains visible. Internal child-event classification MAY continue without becoming terminal text.

Every main-install child process SHALL have stdout and stderr captured rather than inherit the terminal. The installer MAY run npm verbosely into a private temporary log and classify recognized events internally. Output from a successful child SHALL otherwise be discarded, including deprecation warnings, funding text, audit summaries, lifecycle-script policy warnings, package counts, and npm version notices. After all installation and verification work succeeds, the progress row SHALL be completed and removed or replaced, and stdout SHALL contain exactly `a1 successfully installed` followed by one newline in the terminal's unstyled default foreground, matching update success and appearing white under the maintainer's current terminal theme. When the installation is complete but only future shells can resolve the installed launcher, as defined by the per-user prefix requirement, stdout SHALL instead contain exactly `a1 successfully installed; open a new terminal to use it` followed by one newline in the same treatment. It SHALL NOT use green or another fixed success color.

Normal installer output SHALL NOT disclose the npm prefix, package root, launcher path, user home, shell startup file, data directory, target version, dependency names, or package/file counts. A path MAY appear only in a bounded actionable failure or explicit verbose diagnostic when identifying it is necessary to recover safely. When output is not interactive, the animated row and ANSI styling SHALL be omitted and the same final success line SHALL remain.

#### Scenario: npm succeeds after writing warnings
- **WHEN** npm installs the exact target successfully while writing deprecation, funding, lifecycle-policy, package-count, or version notices
- **THEN** none of that child output SHALL reach the terminal
- **AND** the user SHALL observe one selected-accent progress row ending at its percentage followed by exactly `a1 successfully installed`

#### Scenario: A shorter progress frame replaces earlier content
- **WHEN** an interactive progress frame redraws a row that previously contained additional text
- **THEN** the new visible row SHALL use a 38-cell bar and end at `<percentage>%`
- **AND** no characters from the previous row SHALL remain visible to its right

#### Scenario: npm work has no measured completion
- **WHEN** the global npm child remains active without reporting usable progress
- **THEN** the progress row MAY continue moving toward its next milestone
- **AND** SHALL remain visibly below that milestone until npm exits successfully

#### Scenario: Normal installation output is inspected
- **WHEN** a stable, development, or exact-version installation proceeds normally
- **THEN** no installation destination, npm prefix, launcher path, user path, shell startup file, target version, dependency identity, or count SHALL be printed

#### Scenario: Output is redirected
- **WHEN** the installer succeeds without an interactive output terminal
- **THEN** stdout SHALL contain exactly `a1 successfully installed` followed by one newline
- **AND** SHALL contain no carriage-return progress frames or ANSI styling

#### Scenario: The installed command needs a new terminal
- **WHEN** a per-user installation succeeds and the invoking shell's PATH does not resolve the installed launcher
- **THEN** stdout SHALL contain exactly `a1 successfully installed; open a new terminal to use it` followed by one newline

#### Scenario: The installer package is inspected
- **WHEN** the exact installer artifact is unpacked
- **THEN** its executable and one declared shared palette asset SHALL remain dependency-free
- **AND** the palette asset SHALL export the same named accents and blue default as the corresponding A1 release

#### Scenario: Install with a saved accent or no profile
- **WHEN** the installer runs under a profile with an explicit stored accent or under a fresh profile without a settings document
- **THEN** its interactive completed segment SHALL match the selected A1 palette color or blue default, respectively
- **AND** neither case SHALL start the agent or leak the document path to the normal transcript

### Requirement: Installation resolves and verifies one exact target
The installer SHALL use the active npm executable and configuration to resolve the stable `latest` channel by default, the development `next` channel for bare `--develop`, or one immutable published numbered development version for `--develop <preview-or-version>`. It SHALL validate the authoritative `@timurproko/a1` identity and one exact semantic version and SHALL pass that exact version rather than a moving tag to the global mutating command. A numeric preview SHALL resolve only when exactly one published application version ends in that development number; a full preview SHALL resolve only when that exact version is published. It SHALL use cross-platform fixed argument arrays, SHALL NOT construct an interpolated shell command, and SHALL NOT persistently change npm configuration. Zero-numbered or malformed previews, duplicate selectors, unsupported options, ambiguous preview numbers, and extra arguments SHALL fail before installation mutation.

A fresh installation SHALL report success only after npm exits successfully, the canonical global package path identifies the exact target and expected package role, the complete platform launcher set targets that package, the installed tree's declared activation contract reports completion, the exact release is active, and command resolution selects the installed launcher rather than a stale or foreign executable. Command resolution SHALL use the invoking PATH, extended with the per-user `bin` directory only when the installer activated it for future shells under the per-user prefix requirement. A later ordinary launch SHALL not need to print installation or activation output. Normal success SHALL keep every verified path private.

#### Scenario: The stable channel is resolved
- **WHEN** active npm reports a valid latest A1 version for a bare installer invocation
- **THEN** the installer SHALL globally install `@timurproko/a1@<that-exact-version>` with fixed arguments and captured streams
- **AND** SHALL NOT mutate npmrc or global/user npm settings

#### Scenario: The development channel is resolved
- **WHEN** the installer receives bare `--develop` and active npm reports a valid A1 `next` version
- **THEN** the installer SHALL globally install that exact resolved development version with fixed arguments

#### Scenario: A numbered development preview is selected
- **WHEN** the installer receives `--develop 107` and npm lists exactly one published version ending in `-dev.107`
- **THEN** the global mutating command SHALL name that exact published version
- **AND** SHALL perform no moving-channel selection

#### Scenario: An exact development version is selected
- **WHEN** the installer receives `--develop 0.1.8-dev.107` and npm lists that exact publication
- **THEN** the global mutating command SHALL name exactly `@timurproko/a1@0.1.8-dev.107`
- **AND** SHALL perform no moving-channel selection

#### Scenario: Target selectors conflict
- **WHEN** a selector is repeated, a preview is zero-numbered or malformed, a numeric preview is absent or ambiguous, an exact preview is absent, or an unsupported option or extra argument is supplied
- **THEN** the installer SHALL fail before installation mutation

#### Scenario: npm exits zero but the target is incomplete
- **WHEN** package identity, version, role, launcher ownership, activation verdict, or active release does not match the resolved target
- **THEN** the installer SHALL fail without printing the success message

#### Scenario: Installation is complete
- **WHEN** package installation, launcher verification, immutable materialization, certification, warmup, supervision, active-reference commit, and command-resolution verification all succeed for the exact target
- **THEN** the installer SHALL print its exact success result without printing the installation destination
- **AND** the next `a1` invocation SHALL use the already active release without installation diagnostics

#### Scenario: Another launcher wins command resolution
- **WHEN** the installed launcher set is complete but the invoking environment, including any activated per-user `bin` directory, resolves `a1` to a stale or foreign launcher
- **THEN** the installer SHALL not report complete success
- **AND** SHALL emit one concise actionable result without exposing the conflicting path unless verbose diagnostics are requested
