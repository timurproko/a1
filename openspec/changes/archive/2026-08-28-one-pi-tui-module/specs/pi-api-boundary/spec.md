## ADDED Requirements

### Requirement: One terminal module identity per process
A1 and pinned Pi SHALL resolve pinned Pi's terminal package to the same file, so
that a class an extension patches is the class A1 renders. Where the installed
tree carries more than one copy, which copy A1 uses SHALL be decided by declared
resolution rather than by the layout of the tree.

A1 SHALL declare that resolution in its own package manifest, as an alias naming
pinned Pi's copy with the ordinarily-resolved copy as its fallback — the fallback
applying only where a single copy exists and both sides therefore agree. A1's
modules SHALL import that alias rather than the package name, so no import site
decides for itself.

A1 SHALL NOT create, move, or delete files in an installed dependency tree to
achieve this, at install, at launch, or at any other time.

#### Scenario: The tree carries two copies
- **WHEN** npm materializes the terminal package both at the root and nested inside pinned Pi
- **THEN** A1 SHALL resolve the nested copy, which is the one pinned Pi hands extensions
- **AND** the tree SHALL be left exactly as it was installed

#### Scenario: The tree carries one copy
- **WHEN** the terminal package is installed once
- **THEN** A1 and pinned Pi SHALL both resolve that copy through the declared fallback

#### Scenario: A module imports the package directly
- **WHEN** production source imports pinned Pi's terminal package by name rather than through the alias
- **THEN** the architecture check SHALL reject it, as it rejects any other unbounded Pi import

### Requirement: A split terminal module identity is reported, never silent
Launch SHALL compare what A1 resolves against what pinned Pi resolves, and SHALL
report a difference on the error stream before the interface is drawn. The
failure this prevents produces no error of its own — extension surfaces simply do
not appear — so its detection SHALL NOT depend on someone noticing what is
missing.

Reporting SHALL NOT prevent launch: a degraded interface is more useful than
none, and the report SHALL name both resolved paths so the cause is actionable.

#### Scenario: The alias no longer names Pi's copy
- **WHEN** A1 and pinned Pi resolve the terminal package to different files
- **THEN** launch SHALL report both paths and say that extension surfaces may not render
- **AND** SHALL continue starting

#### Scenario: Either side cannot be resolved
- **WHEN** the alias or pinned Pi's copy cannot be resolved at all
- **THEN** launch SHALL report which side failed and why, and SHALL continue starting

#### Scenario: Both sides agree
- **WHEN** the two resolutions name the same file
- **THEN** launch SHALL report nothing
