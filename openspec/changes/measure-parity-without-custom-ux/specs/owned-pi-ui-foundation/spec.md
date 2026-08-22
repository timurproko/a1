## MODIFIED Requirements

### Requirement: Declared A1-owned additions and replacements extend the accepted baseline
After parity acceptance, A1 MAY present surfaces, commands, and content that pinned Pi does not have, and MAY supersede a specific pinned route with an A1-owned replacement. Every such surface SHALL be declared, as an addition or as a replacement naming the route it supersedes. A declared addition SHALL NOT replace, reorder, restyle, intercept, or change the reachability of any pinned surface. A declared replacement SHALL keep every capability of the route it supersedes reachable, and SHALL leave every other pinned surface untouched.

Parity comparison SHALL be measured against A1 with every declared surface switched off, so what is compared is A1's rendering, layout, and input against pinned Pi rather than the product's own experience. Every pinned surface SHALL be required to match; no checkpoint SHALL be classified as superseded, forgiven, or excluded. The composition used for that comparison SHALL be the product's own composition with owned surfaces disabled, never a separate implementation of it. That a replacement keeps the superseded route's capabilities reachable SHALL be verified directly rather than through the parity comparison.

#### Scenario: Declare and present an A1-owned addition
- **WHEN** an accepted A1-owned surface is declared as an addition and the user reaches it through its A1-owned route
- **THEN** it SHALL open, and every pinned surface SHALL remain reachable and unchanged

#### Scenario: Declare and present an A1-owned replacement
- **WHEN** an accepted A1-owned surface is declared as the replacement for a named pinned route and the user invokes that route
- **THEN** the replacement SHALL open, every capability the pinned route exposed SHALL remain reachable from it, and no other pinned surface SHALL change

#### Scenario: Compare parity with a declared surface present
- **WHEN** parity comparison runs while declared additions or replacements exist in the product
- **THEN** it SHALL run against A1 with those surfaces switched off
- **AND** every checkpoint SHALL be required to match pinned Pi, with none classified as superseded

#### Scenario: Classification follows the declaration
- **WHEN** a declared replacement is added or removed
- **THEN** no parity classification SHALL change, because the comparison never sees a declared surface

#### Scenario: The parity composition drifts from the product
- **WHEN** the composition used for parity is not the product's own composition with owned surfaces disabled
- **THEN** validation SHALL fail, because a parity run built separately measures itself

#### Scenario: Replacement drops a superseded capability
- **WHEN** a declared replacement omits a capability that the route it supersedes exposed
- **THEN** validation SHALL fail naming the missing capability, and the replacement SHALL remain unaccepted

#### Scenario: Encounter an undeclared surface
- **WHEN** a surface, command, or content region diverges from pinned Pi without being declared
- **THEN** parity SHALL fail

#### Scenario: Addition displaces pinned behavior
- **WHEN** a surface declared as an addition replaces, reorders, restyles, or intercepts a pinned surface, or inserts itself into a pinned surface content, options, or command list
- **THEN** parity SHALL fail even though the surface itself is declared

#### Scenario: Declared surface requested before acceptance
- **WHEN** an A1-owned addition or replacement is requested while the customization prerequisite is unmet
- **THEN** it SHALL remain unavailable, as the customization requirement already provides
