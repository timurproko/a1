## MODIFIED Requirements

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. A1 SHALL
resolve a complete settings value set at startup from declared defaults overlaid with accepted
stored values. A1 SHALL reject an individual stored value that violates its declaration and fall
back to that setting's default rather than to an undeclared or partially applied state. A1 settings
SHALL be distinct from Pi settings and SHALL NOT be derived from, written into, or read out of Pi
settings storage. The declarations SHALL be one table keyed by setting id from which the ordered
declaration list derives, and one settings manager SHALL own resolution, atomic persistence, the
grouped sections, and routing of accepted changes; a declared setting SHALL be readable through a
getter typed by its own declaration, answering the declared default when the resolved set omits it.

#### Scenario: Resolve settings with no stored file
- **WHEN** the owned UI starts and no A1 settings file exists for the active profile
- **THEN** every setting SHALL resolve to its declared default and A1 SHALL start normally without
  reporting an error

#### Scenario: Resolve settings with a partial stored file
- **WHEN** the stored file supplies accepted values for some declared settings and omits others
- **THEN** the supplied values SHALL apply and every omitted setting SHALL resolve to its declared
  default

#### Scenario: Reject an out-of-range stored value
- **WHEN** a stored value is present but violates its setting's declared type or allowed values
- **THEN** that setting SHALL resolve to its declared default, the remaining accepted values SHALL
  still apply, and A1 SHALL report the rejected setting once without failing startup

#### Scenario: Encounter an unknown stored key
- **WHEN** the stored file contains a key that matches no declared setting
- **THEN** A1 SHALL ignore that key, SHALL preserve it on the next write so a downgrade does not
  destroy a newer version's value, and SHALL NOT expose it as a setting

#### Scenario: Read a declared setting through its typed getter
- **WHEN** production code reads a declared A1 setting by id
- **THEN** the value SHALL be typed by that setting's allowed values, SHALL be the value in effect for
  the running session, and SHALL never be absent
