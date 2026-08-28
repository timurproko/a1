## ADDED Requirements

### Requirement: A preview can be installed by name
What follows the colon on `update` SHALL say which build to move to. `next` SHALL
mean the newest preview, and anything else SHALL name a preview outright — by the
commit it was built from, or by its full version. A preview is published as
`<version>-dev.<commit>`, so the commit alone SHALL be enough to identify one, and
the version in front of it SHALL NOT have to be supplied.

The named preview SHALL be resolved against the versions the registry actually
published rather than constructed from the name. A name matching nothing SHALL be
refused and named in the refusal; a name matching more than one published version
SHALL be refused rather than resolved to a guess. Nothing SHALL be installed in
either case.

An empty or unusable name SHALL be refused before anything is asked of the
registry, and the command SHALL take no argument after the colon form.

#### Scenario: A commit is named
- **WHEN** the user runs `a1 update:<commit>` for a commit whose preview was published
- **THEN** A1 SHALL install that preview, whatever version it carries

#### Scenario: A full version is named
- **WHEN** the user runs `a1 update:<version>` for a published preview version
- **THEN** A1 SHALL install that version

#### Scenario: The name matches nothing
- **WHEN** the named commit or version was never published
- **THEN** A1 SHALL refuse, name what it could not find, and install nothing

#### Scenario: The name matches more than one version
- **WHEN** a commit appears in more than one published version
- **THEN** A1 SHALL refuse, list what it found, and ask for a version instead

#### Scenario: The newest preview is wanted
- **WHEN** the user runs `a1 update:next`
- **THEN** A1 SHALL install whatever the preview channel currently points at
