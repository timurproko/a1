## 1. Rename what the repository owns

- [x] 1.1 Rename the four package entries to `cli`, `ui`, `guardian`, and `supervisor`
- [x] 1.2 Rename the native crates and executables to `process-guardian` and `terminal-host`
- [x] 1.3 Point the product identity, package manifest, bootstrap, guardian, workflows, and scripts at the new names
- [x] 1.4 Update every test, document, and provenance record that named the old files

## 2. Write the rule down

- [x] 2.1 Replace the requirement demanding `a1`-prefixed entry filenames
- [x] 2.2 State where the product name belongs — command, package, environment, state, schemas, output
- [x] 2.3 Add governance that fails a product-named file, crate, or executable, naming the offender

## 3. Validate and accept

- [x] 3.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 3.2 Open the pull request and let CI validate
- [ ] 3.3 Record manual acceptance — the installed command still runs and the guardian still contains its tree
