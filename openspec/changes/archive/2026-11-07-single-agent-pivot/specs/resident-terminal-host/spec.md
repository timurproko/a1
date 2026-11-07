## ADDED Requirements

### Requirement: A1 ships no native terminal host
The A1 package SHALL contain no native terminal host, terminal emulator, or per-platform native artifact, and the owned UI SHALL render directly to the terminal that launched it.

#### Scenario: The package is pure JavaScript
- **WHEN** the published package is inspected
- **THEN** it SHALL contain no native addon, terminal-host binary, or platform-specific artifact
- **AND** launching `a1` SHALL NOT start a pseudoterminal host process

## REMOVED Requirements

### Requirement: Resident host primitives identify processes, boots, and OS sessions exactly
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident host endpoints admit only their owner
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident roles launch outside terminal containment through a fixed path
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Session-writer locks belong to the writing process
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Durable file replacement leaves complete content and reports its evidence boundary
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Host exchanges use generation-stable bounded MessagePack frames
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Input control transfers only across a proven ordering barrier
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: One authoritative resident server serves each user profile
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Each tab is owned by its own session holder
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident processes start outside terminal containment
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: The native binary owns the complete terminal data path
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Reattach renders from retained terminal state
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: The tab registry is durable and lease-protected
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Credentials survive server replacement without entering the registry
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Slow clients never stall tabs
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: The server heals itself without losing tabs or creating split brain
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Crashed and hung tabs restart within a bounded budget
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Reboot and logout end tabs without losing sessions
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: The tab bridge reports structured A1 state and controller identity
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident resources are bounded and observable
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Updates retain the active resident cohort
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident tabs have non-interactive maintenance commands
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Host status reports resident identity and health
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: An idle resident server exits after ten minutes
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident support is packaged, certified per platform, and reversible
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident frame composition preserves terminal intensity
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident prompt admission is attachment-size independent
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident prompt settlement closes the current admission
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Interrupted image prompt recovery is honest
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident terminal transport preserves semantic input events
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident terminal transport preserves child controls and modes
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident presentation commits coherent current state
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident hot paths remain independent and bounded
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Interaction parity is certified across the complete resident boundary
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident attach only reads the profile settings document
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: The holder retains complete current terminal surfaces
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident clipboard delivery reaches the active user's standard clipboard
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident publication respects child visual transactions
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident live painting is damage proportional
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Concurrent presentation has independently measured progress
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident presentation capabilities are negotiated and bounded
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Registry commits and viewer fan-out go through one path
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: The attach client's interaction is a pure state machine
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Role reader threads never block on recovery waits
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Resident tabs fit current controller geometry before presentation
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: A holder without a record ends instead of replacing its server
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Role-spawned children never show a console window on Windows
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Windows resident transport readiness is completion-driven
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Wake responsiveness observations separate local completion from physical presentation
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Windows publication does not debounce sustained input indefinitely
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Real-A1 responsiveness evidence rejects delayed presentation
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Release-isolated hosts preserve shared-session writer exclusion
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Active outer resize repaints the complete frame directly
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Persistent execution exposes a minimal stable control API
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Profile workspace continuity is independent of client release
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Control-plane recovery preserves execution and retention
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Federated tab transitions preserve the visible strip contract
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Continuity discovery distinguishes dead historical debris from live resident authority
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.

### Requirement: Attach presentation hides only a satisfied immutable-predecessor restart instruction
**Reason**: The native terminal host (`native/terminal-host`, libghostty-vt, PTY holders, attach/server/holder roles, the generation-1 protocol, and the terminal-host Node-API addon) is removed. A1 ships no native code; the session writer guard moves to Node.

**Migration**: None for users. Development scripts, proof gates, provenance policies, and CI lanes that built or certified the host are deleted with it.
