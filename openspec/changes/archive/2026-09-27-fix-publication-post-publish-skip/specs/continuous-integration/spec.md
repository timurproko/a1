## ADDED Requirements

### Requirement: Allowed prerequisite skips do not suppress required publication outcomes
A publication job that intentionally permits an upstream prerequisite to be skipped SHALL evaluate every subsequent required job explicitly. Post-publication smoke SHALL run only when its selected work requires publication and its direct plan, package, and publish dependencies all succeeded. Release completion SHALL run only when its direct plan, package, publish, and post-publication dependencies all succeeded. Both jobs SHALL evaluate their explicit predicates despite allowed transitive skips and SHALL remain ineligible after a failed, cancelled, or skipped direct prerequisite. The aggregate SHALL continue to reject missing or skipped post-publication smoke and completion whenever publication work was required.

#### Scenario: Development documentation review is intentionally skipped
- **WHEN** development publication skips its stable/nightly-only documentation review but package validation and registry publication succeed
- **THEN** the selected Windows, Linux, and macOS published-pair smoke lanes SHALL execute
- **AND** completion and the publication aggregate SHALL require those lanes to succeed

#### Scenario: A direct publication dependency fails
- **WHEN** package acquisition, publication, or required published-pair smoke fails, is cancelled, or is skipped unexpectedly
- **THEN** the next dependent publication job SHALL remain ineligible
- **AND** the aggregate SHALL fail rather than reinterpret the missing outcome as an allowed skip
