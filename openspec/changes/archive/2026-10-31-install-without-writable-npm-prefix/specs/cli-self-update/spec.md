## MODIFIED Requirements

### Requirement: Self-update is limited to the managed global installation
A1 SHALL verify through npm's global package-root resolution that the running package occupies the exact `@timurproko/a1` package location in an npm-managed global installation before replacing it. The installation MAY use npm's active default prefix or a different prefix whose inferred global root active npm independently confirms and whose complete platform launcher set targets that package. On Unix a launcher targets the package when it is a regular executable file naming the package's `bin/cli.js` entry or a symbolic link whose canonical target is exactly that package's canonical `bin/cli.js`; update recovery SHALL apply the same rule when deciding whether an installed target is callable. A1 SHALL pin replacement to the confirmed prefix that owns the running package. It SHALL refuse automatic replacement when running from a local checkout, npm link, malformed package layout, unconfirmed root, or a different package-manager context.

#### Scenario: Running package is globally managed by npm
- **WHEN** the running A1 package exactly occupies its canonical package location beneath npm's canonical active global package root
- **THEN** A1 may perform the global update against that root

#### Scenario: Running package is managed under a confirmed non-default npm prefix
- **WHEN** the running A1 package exactly occupies the canonical package location under another global root, active npm confirms that root for its inferred prefix, and the prefix's complete launcher set targets that package
- **THEN** A1 SHALL update the invoked installation in place using that explicit prefix
- **AND** SHALL NOT create or select an installation under the active default prefix merely because the defaults differ

#### Scenario: A per-user installation has an npm symlink launcher
- **WHEN** A1 runs from `~/.local/lib/node_modules/@timurproko/a1`, active npm confirms `~/.local` as the inferred prefix, and `~/.local/bin/a1` is the symbolic link npm created to that package's `bin/cli.js`
- **THEN** A1 SHALL treat the installation as managed and update it in place with `--prefix ~/.local`
- **AND** a launcher symlink resolving to any other target SHALL leave the installation unmanaged

#### Scenario: Running package is not managed by global npm
- **WHEN** the running package path does not have npm's exact global package layout or active npm does not confirm the inferred root
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any package, launcher, supervisor, or update transaction

#### Scenario: Running package is linked or checked out locally
- **WHEN** the running A1 package canonicalizes to a local checkout, npm link target, or another package-manager context
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any installation
