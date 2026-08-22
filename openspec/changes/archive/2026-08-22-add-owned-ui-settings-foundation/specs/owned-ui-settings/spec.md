## Purpose

Defines A1-owned persisted user preferences for the owned UI: their declared shape and defaults,
profile-local storage and forward migration, resolution at startup, live application to a running
session, and the grouped section model a surface renders.

## ADDED Requirements

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. A1 SHALL
resolve a complete settings value set at startup from declared defaults overlaid with accepted
stored values. A1 SHALL reject an individual stored value that violates its declaration and fall
back to that setting's default rather than to an undeclared or partially applied state. A1 settings
SHALL be distinct from Pi settings and SHALL NOT be derived from, written into, or read out of Pi
settings storage.

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

### Requirement: A1 settings persist profile-local and survive restart
A1 SHALL store settings under the active A1 configuration root, scoped to the active A1 profile.
A1 SHALL NOT write settings into a Pi profile directory, and SHALL NOT let one profile's settings
be observed or modified from another. A stored value SHALL survive process restart and SHALL be
written durably enough that an interrupted write cannot leave the file unreadable.

#### Scenario: Change a setting and restart
- **WHEN** the user changes a setting, the setting is stored, and A1 is restarted with the same
  profile
- **THEN** the changed value SHALL resolve on the next start

#### Scenario: Keep profiles isolated
- **WHEN** two A1 profiles have different stored values for the same setting
- **THEN** each profile SHALL resolve only its own stored value, and neither SHALL inherit from the
  other, from a prior process, or from Pi profile state

#### Scenario: Vanilla and sandbox profiles are untouched
- **WHEN** A1 writes its settings
- **THEN** the contents and layout of `~/.pi/agent` and `~/.a1/sandbox` SHALL be unchanged

#### Scenario: Interrupt a settings write
- **WHEN** a settings write is interrupted before completion
- **THEN** the next start SHALL resolve either the complete previous value set or the complete new
  one, and SHALL NOT resolve a truncated file as authoritative

### Requirement: Unreadable or unsupported settings never block startup
A1 SHALL treat a settings file it cannot read, parse, or interpret as absent. Startup SHALL
continue with declared defaults, the condition SHALL be reported once, and the unreadable file
SHALL be preserved rather than deleted or silently overwritten before the user has been told.

#### Scenario: Corrupt settings file
- **WHEN** the settings file exists but cannot be parsed
- **THEN** A1 SHALL start with declared defaults, SHALL report that the file was ignored and where
  it is, and SHALL NOT exit or present a broken settings surface

#### Scenario: Settings file from a newer version
- **WHEN** the stored version stamp is newer than the running A1 understands
- **THEN** A1 SHALL start with declared defaults for anything it cannot interpret, SHALL report the
  version mismatch, and SHALL NOT rewrite the file into an older shape without the user changing a
  setting

#### Scenario: Settings location is not writable
- **WHEN** the settings location cannot be written
- **THEN** the session SHALL continue with resolved values, a change SHALL report that it could not
  be stored, and the surface SHALL NOT claim the change was saved

### Requirement: Stored settings migrate forward on read
A1 SHALL stamp stored settings with a version. When a stored version is older than the running
version, A1 SHALL migrate the values forward on read through declared migrations, apply the
migrated values, and persist the migrated form on the next write. A migration SHALL preserve the
user's intent for a renamed or restructured setting rather than resetting it to its default.

#### Scenario: Read an older supported version
- **WHEN** the stored version is older and every intervening migration is declared
- **THEN** the migrated values SHALL apply and the resolved set SHALL match what the user last chose

#### Scenario: Migrate a renamed setting
- **WHEN** a declared migration renames or restructures a setting the user had changed
- **THEN** the user's value SHALL appear under the new declaration rather than reverting to the
  default

#### Scenario: Migration cannot complete
- **WHEN** a required migration is missing or fails
- **THEN** A1 SHALL resolve declared defaults, report the condition, and preserve the original file

### Requirement: A changed setting applies to the running session
A1 SHALL apply a changed setting to the running session at the point the change is accepted,
without requiring a restart, and SHALL keep resolved values consistent across every surface that
reads them within that session. A setting whose effect cannot be applied to a running session SHALL
declare that, and its surface SHALL say so when it is changed rather than appearing to take effect.

#### Scenario: Change a live-applicable setting
- **WHEN** the user accepts a change to a setting declared as live-applicable
- **THEN** the new value SHALL take effect in the running session and every surface reading that
  setting SHALL observe the same value

#### Scenario: Change a restart-required setting
- **WHEN** the user accepts a change to a setting declared as requiring a restart
- **THEN** the value SHALL be stored, the surface SHALL state that it applies on the next start, and
  the running session SHALL continue with the previous value

#### Scenario: Abandon a change
- **WHEN** the user cancels out of editing a setting before accepting it
- **THEN** no value SHALL be stored and the running session SHALL be unaffected

### Requirement: Resolved settings are offered to a surface as grouped sections
A1 SHALL expose the resolved settings as sections a consuming surface can present without knowing
where a value is stored: the declared A1 settings in their own section, and the settings reported by
the engine settings port under a distinct Agent section. Each entry SHALL carry its current value,
whether it can be changed from A1, its available choices where its source declares them, and its
description where its source provides one. Agent settings SHALL be read and written only through the
engine settings port; A1 SHALL NOT write Pi settings storage directly. Where the engine does not
advertise settings write capability, its entries SHALL be reported as not editable with a stated
reason rather than appearing editable. This change ships no user-visible surface: the pinned settings
route is unchanged, and the surface that renders these sections arrives with the owned UI component
system.

#### Scenario: Build sections with an attached engine
- **WHEN** sections are built while the engine reports its settings
- **THEN** the A1 section SHALL list every declared setting with its resolved value, choices,
  description, and whether the value came from a default, and the Agent section SHALL list every
  setting the engine reported

#### Scenario: Change a setting in the A1 section
- **WHEN** a change is accepted for an entry in the A1 section
- **THEN** the value SHALL be written to the A1 settings document and SHALL NOT be sent to the engine
  settings port

#### Scenario: Change a setting in the Agent section
- **WHEN** a change is accepted for an entry in the Agent section and the engine advertises settings
  write capability
- **THEN** the value SHALL be written through the engine settings port, flushed where the engine
  advertises flush capability, and SHALL NOT be written into the A1 settings document

#### Scenario: Engine advertises no settings write capability
- **WHEN** the engine settings port reports no write capability
- **THEN** every Agent entry SHALL be reported as not editable with a stated reason, and an attempted
  change SHALL be refused rather than silently dropped

#### Scenario: Agent settings cannot be read
- **WHEN** the engine settings port fails, reports no settings, or is absent
- **THEN** the A1 section SHALL still be complete and usable, the Agent section SHALL report why it is
  unavailable, and no stale or invented agent entry SHALL appear

#### Scenario: Report a failed change
- **WHEN** a change cannot be stored or cannot be written through the engine
- **THEN** the failure SHALL be reported to the caller and the change SHALL NOT be reported as applied
