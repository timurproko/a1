## REMOVED Requirements

### Requirement: A1 launches one exact foreground command
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot; bare `a1` and `a1 pi` are specified by `a1-shell` and `launch-profiles`.

**Migration**: None.

### Requirement: Transparent execution is application-agnostic
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot.

**Migration**: None.

### Requirement: Transparent sessions delegate terminal behavior to the physical terminal
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot.

**Migration**: None.

### Requirement: Transparent sessions advertise their limitations
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot.

**Migration**: None.

### Requirement: Terminal exit returns a usable parent terminal
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot. The owned UI's bounded terminal restoration on exit is specified by `a1-shell` and owned by `foundation/terminal-cleanup`.

**Migration**: None.

### Requirement: Stable support is certified per platform
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot; platform support claims for the owned UI follow `a1-shell`.

**Migration**: None.

### Requirement: Transparent root exit closes remaining instance descendants
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot; the one-process launch tree is specified by `a1-shell`.

**Migration**: None.

### Requirement: Transparent launch tracks lifecycle but no terminal bytes
**Reason**: The transparent terminal capability has no production owner since the single-agent pivot.

**Migration**: None.
