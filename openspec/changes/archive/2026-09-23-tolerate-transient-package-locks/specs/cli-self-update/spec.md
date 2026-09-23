## ADDED Requirements

### Requirement: Package release is verified with bounded patience
After ownership of the installed package has been released, A1 SHALL verify that nothing still holds the package tree before replacing it, and SHALL keep re-checking for a bounded window of fifteen seconds when the check is refused because the tree is held, pausing longer between checks up to a one-second cap. A refusal that does not indicate a held tree SHALL fail at once. When the window closes with the tree still held, A1 SHALL fail without having changed the installation and SHALL name the package path, the kinds of program that hold a tree, and that the update can be run again. A check that moved the tree SHALL put it back under its own name with the same patience, and SHALL name where the tree is if that cannot be done.

#### Scenario: The package is briefly held after a session ends
- **WHEN** the update checks the package tree while a scanner, an indexer, a file browser, or a session still finishing its exit holds a file under it, and the holder lets go within the window
- **THEN** the update SHALL proceed and install the target release
- **AND** SHALL NOT report the hold

#### Scenario: The package stays held
- **WHEN** the package tree remains held for the whole window
- **THEN** the update SHALL fail and roll back without modifying the installation
- **AND** SHALL report how long it waited, the package path, the kinds of program that hold a tree, and that nothing was changed and the update can be run again

#### Scenario: The check fails for a reason other than a hold
- **WHEN** the check is refused with an error that does not indicate a held tree
- **THEN** the update SHALL fail at once without waiting
- **AND** SHALL report that the package could not be verified rather than that it is locked

#### Scenario: The tree is held while it wears the check's name
- **WHEN** the check has moved the tree and a holder appears before it is moved back
- **THEN** the update SHALL keep trying to restore it for the remainder of the window
- **AND** if the tree cannot be restored SHALL name both where it is and where it belongs
