# ui-shortcuts Specification

## Purpose
Defines A1 keyboard shortcuts as declared data rather than scattered key comparisons, so dispatch,
conflict detection, and the shortcut listing all read one registry.

## Requirements

### Requirement: Shortcuts are declared, not hand-matched
Every A1-owned shortcut SHALL be declared with its key, the scope it applies to, a description, and
the action it invokes. Dispatch SHALL resolve a key through those declarations rather than through
inline key comparisons, so a binding cannot exist without being declared.

#### Scenario: Declare and dispatch a shortcut
- **WHEN** a declared shortcut's key arrives within its scope
- **THEN** its action SHALL be invoked

#### Scenario: Key outside its scope
- **WHEN** a declared shortcut's key arrives outside the scope it declares
- **THEN** its action SHALL NOT be invoked and the key SHALL continue to the surrounding handler

#### Scenario: Undeclared key
- **WHEN** a key matching no declaration arrives
- **THEN** it SHALL continue to the surrounding handler unchanged

### Requirement: Conflicting shortcuts are detected, not discovered
Two shortcuts declaring the same key in overlapping scopes SHALL be reported as a conflict when the
registry is assembled. A conflict SHALL name both declarations and the key. A1 SHALL NOT silently
resolve a conflict by declaration order.

#### Scenario: Two shortcuts claim one key in the same scope
- **WHEN** two declarations share a key and scope
- **THEN** assembling the registry SHALL report the conflict naming both and the key

#### Scenario: Same key in disjoint scopes
- **WHEN** two declarations share a key but their scopes do not overlap
- **THEN** both SHALL be accepted and each SHALL apply only within its own scope

#### Scenario: A screen shadows a global shortcut
- **WHEN** a screen declares a key that a global shortcut also declares
- **THEN** the shadowing SHALL be reported, and the screen's binding SHALL apply while that screen is
  presented

### Requirement: The registry is the source for what the user is shown
Any listing of available shortcuts SHALL be derived from the registry, so a listed shortcut is one
that dispatch would actually invoke and a working shortcut cannot be missing from the listing.

#### Scenario: List shortcuts
- **WHEN** the available shortcuts are listed
- **THEN** the listing SHALL contain every declared shortcut in scope with its key and description

#### Scenario: Add a shortcut
- **WHEN** a new shortcut is declared
- **THEN** it SHALL appear in the listing without any separate listing edit

#### Scenario: Listing and dispatch cannot diverge
- **WHEN** a listing entry names a key
- **THEN** dispatching that key in that scope SHALL invoke the action the listing describes
