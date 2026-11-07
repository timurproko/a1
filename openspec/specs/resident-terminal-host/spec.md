# resident-terminal-host Specification

## Purpose
Define the cross-platform native primitives, bounded protocol, and controller-transfer foundation that later resident terminal sessions can use without introducing product wiring or user-visible tab behavior.

## Requirements

### Requirement: A1 ships no native terminal host
The A1 package SHALL contain no native terminal host, terminal emulator, or per-platform native artifact, and the owned UI SHALL render directly to the terminal that launched it.

#### Scenario: The package is pure JavaScript
- **WHEN** the published package is inspected
- **THEN** it SHALL contain no native addon, terminal-host binary, or platform-specific artifact
- **AND** launching `a1` SHALL NOT start a pseudoterminal host process
