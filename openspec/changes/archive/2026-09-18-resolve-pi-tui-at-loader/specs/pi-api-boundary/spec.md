## MODIFIED Requirements

### Requirement: One terminal module identity per process
A1 and pinned Pi SHALL resolve pinned Pi's terminal package to the same file, so
that a class an extension patches is the class A1 renders. Where the installed
tree carries more than one copy, which copy A1 uses SHALL be decided at the
module loader rather than by the layout of the tree.

Every shipped entry SHALL, before any A1 or Pi module loads, ask Node which copy
pinned Pi resolves and install a synchronous resolve hook that rewrites every
resolved terminal-package module URL beneath that installation to that copy,
whatever specifier or path an importer used. A1's modules, the bundled Pi public
artifact, and Pi's extension loader SHALL therefore share one module without any
of them choosing. The hook SHALL be scoped to its own installation so fixture
trees and other release copies inspected from the same process keep their own
resolution. A1's modules SHALL import the package by name; the manifest SHALL
declare no import alias and no install script for it.

A1 SHALL NOT create, move, or delete files in an installed dependency tree to
achieve this, at install, at launch, or at any other time.

#### Scenario: The tree carries two copies
- **WHEN** npm materializes the terminal package both at the root and nested inside pinned Pi
- **THEN** every import in the process, by package name or by the hoisted copy's path, SHALL load the nested copy pinned Pi hands extensions
- **AND** the tree SHALL be left exactly as it was installed

#### Scenario: The tree carries one copy
- **WHEN** the terminal package is installed once
- **THEN** the hook SHALL find both answers identical and rewrite nothing

#### Scenario: A module imports the package directly
- **WHEN** production source outside the runtime or component adapter boundary imports pinned Pi's terminal package
- **THEN** the architecture check SHALL reject it, as it rejects any other unbounded Pi import

#### Scenario: Tests share the product's identity
- **WHEN** the unit suite starts a worker
- **THEN** the same hook SHALL be installed before any test module loads
- **AND** an identity test SHALL prove the package name, the hoisted path, and pinned Pi's path yield one class object

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
- **WHEN** the package name or pinned Pi's copy cannot be resolved at all
- **THEN** launch SHALL report which side failed and why, and SHALL continue starting

#### Scenario: Both sides agree
- **WHEN** the two resolutions name the same file
- **THEN** launch SHALL report nothing
