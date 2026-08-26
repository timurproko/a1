## MODIFIED Requirements

### Requirement: Current profile identity declares only retained roots
The product identity authority SHALL declare A1's `~/.a1/agent` profile and Pi's ordinary `~/.pi/agent` profile. It SHALL NOT declare an unused third profile root or unused launch-argument environment channel.

#### Scenario: Validate product identity
- **WHEN** current identity metadata is loaded
- **THEN** its exact state and environment keys SHALL contain only values consumed by current runtime behavior
