## ADDED Requirements

### Requirement: The production module graph is acyclic and reachable
The architecture gate SHALL build the relative-import graph of every module under `src/` and SHALL fail on any strongly connected component of more than one file, reporting its members. It SHALL also fail on any module other than an owner `index.ts` that cannot be reached through runtime imports, dynamic imports, or `import.meta.url` worker references from the entry set: `bin/` imports of built modules, `package.json` executables and exports, the declared startup roots, and explicitly declared process entries. Currently accepted cycles and unreachable modules SHALL be recorded in one committed allowlist; the gate SHALL fail on an unlisted cycle or unreachable module and SHALL fail when a listed entry no longer holds, so the allowlist can only shrink.

#### Scenario: A change introduces a cycle
- **WHEN** a new or edited import closes a cycle that the allowlist does not record
- **THEN** the architecture gate SHALL fail listing every member of that cycle

#### Scenario: A change strands a module
- **WHEN** a module other than an owner `index.ts` loses its last runtime importer and is not a declared process entry
- **THEN** the architecture gate SHALL fail naming the module

#### Scenario: A listed cycle or stranded module is fixed
- **WHEN** a change breaks a listed cycle or deletes or reconnects a listed module without removing its allowlist entry
- **THEN** the architecture gate SHALL fail reporting the stale entry

#### Scenario: A declared process entry gains an importer
- **WHEN** a module declared as a process entry becomes reachable through an ordinary import
- **THEN** the architecture gate SHALL fail reporting the declaration as stale
