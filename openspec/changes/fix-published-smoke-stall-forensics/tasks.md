## 1. Process history during long smoke commands

- [ ] 1.1 Sample fixture-owned processes while a command with a long budget runs, without recording sampled identities into settlement state, and expose first and last sightings with arguments and sampling errors.
- [ ] 1.2 Write the sanitized process history into failure evidence.
- [ ] 1.3 Add focused regression cases for sampling, disappearance ordering, sampling errors, and settlement independence.

## 2. Windows system records and replacement state at failure

- [ ] 2.1 Read bounded sanitized Windows Defender operational, application crash and error-reporting, and service or shutdown events since the fixture began, with antimalware status, and write them into Windows failure evidence.
- [ ] 2.2 Record retired package directories, installed manifest versions, and public launcher targets for both installation prefixes in failure evidence.
- [ ] 2.3 Add focused regression cases for event capture bounds and redaction, the non-Windows no-op, and replacement state capture.
