## REMOVED Requirements

### Requirement: Foreground lease carries lifecycle but no terminal bytes
**Reason**: A singular foreground lease conflates independent terminals and is replaced by per-invocation launch-instance registration.

**Migration**: Transparent brokers register their root command and lifecycle under the shared launch instance created for their invocation; no product-wide uniqueness constraint remains.

## ADDED Requirements

### Requirement: Transparent instance registration carries lifecycle but no terminal bytes
A transparent launch owner and supervisor SHALL exchange only validated launch intent, launch-instance identity, native process and containment identity, ownership state, stop intent, and lifecycle outcome. Ordinary terminal bytes and reconstructed display state SHALL NOT cross the control protocol.

#### Scenario: Handoff completes
- **WHEN** a transparent child starts successfully
- **THEN** its launch instance SHALL register exact process and containment identity and wait for lifecycle completion without ordinary terminal reads, writes, parsing, relaying, or render timers

#### Scenario: Another transparent session is active
- **WHEN** a transparent child starts while other transparent instances are active in other terminals
- **THEN** A1 SHALL register the new instance independently without reassigning or terminating another session

#### Scenario: Update requests shutdown
- **WHEN** an update targets verified active transparent instances
- **THEN** A1 SHALL apply bounded owned-process lifecycle control to every affected instance without introducing terminal emulation as a cleanup path

### Requirement: Transparent root exit closes remaining instance descendants
A transparent instance SHALL reach its terminal outcome only after the root command has exited and its remaining verified descendants have been closed within the bounded instance cleanup policy.

#### Scenario: Pi exits after starting a daemon
- **WHEN** the transparent Pi root exits while an extension daemon or agent descendant remains
- **THEN** A1 SHALL terminate the remaining instance-owned process tree before returning the final command outcome
