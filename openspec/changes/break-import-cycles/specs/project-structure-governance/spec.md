## MODIFIED Requirements

### Requirement: The production module graph is acyclic and reachable
The architecture gate SHALL build the relative-import graph of every module under `src/` and SHALL fail on any strongly connected component of more than one file, reporting its members; the production graph SHALL contain no cycle and the allowlist SHALL record none. It SHALL also fail on any module other than an owner `index.ts` that cannot be reached through runtime imports, dynamic imports, or `import.meta.url` worker references from the entry set: `bin/` imports of built modules, `package.json` executables and exports, the declared startup roots, and explicitly declared process entries. A module whose every export is a type SHALL instead be judged reachable through any import, including type-only imports, because it is consumed at compile time and never loaded. The import scanner shared by the startup graph and the module graph SHALL read one statement at a time: a clause SHALL NOT extend past a statement terminator, so a bare-specifier import never turns the relative type import that follows it into a runtime edge. Currently accepted unreachable modules SHALL be recorded in one committed allowlist; the gate SHALL fail on an unlisted cycle or unreachable module and SHALL fail when a listed entry no longer holds, so the allowlist can only shrink. A module that has no runtime importer and no declared entry role SHALL be deleted rather than allowlisted unless a named follow-up change owns its disposition.

#### Scenario: A change introduces a cycle
- **WHEN** a new or edited import closes a cycle between production modules
- **THEN** the architecture gate SHALL fail listing every member of that cycle

#### Scenario: A shared type would close a cycle
- **WHEN** two modules each need a type the other defines
- **THEN** the type SHALL move to a leaf module both import, and the original module MAY re-export it so its barrel surface is unchanged

#### Scenario: A change strands a module
- **WHEN** a module other than an owner `index.ts` loses its last runtime importer and is not a declared process entry
- **THEN** the architecture gate SHALL fail naming the module

#### Scenario: A type-only module is reached by type imports
- **WHEN** a module exports only types and a reachable module imports it with `import type`
- **THEN** the architecture gate SHALL treat it as reachable
- **AND** an ordinary module reached only through `import type` SHALL still be reported

#### Scenario: A bare-specifier import precedes a relative type import
- **WHEN** a module imports a package or Node built-in on one line and a relative type on the next
- **THEN** the scanner SHALL record no runtime edge for the type import
- **AND** the eager startup graph SHALL not count the type-only target

#### Scenario: A listed cycle or stranded module is fixed
- **WHEN** a change deletes or reconnects a listed module without removing its allowlist entry, or an allowlist still names a cycle that no longer exists
- **THEN** the architecture gate SHALL fail reporting the stale entry

#### Scenario: A declared process entry gains an importer
- **WHEN** a module declared as a process entry becomes reachable through an ordinary import
- **THEN** the architecture gate SHALL fail reporting the declaration as stale
