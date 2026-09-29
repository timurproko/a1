## 1. Standardize the preferred command

- [ ] 1.1 Replace current root, installer-package, and release-runbook installation examples with `npm x -y -- @timurproko/a1-install`, preserving stable, development, numeric-preview, and exact-preview forms.
- [ ] 1.2 Update the canonical silent-installer contract from `npx` to `npm x`, require the explicit npm/package argument boundary, and retain the optional-confirmation and installer-owned behavior guarantees.

## 2. Keep guidance enforceable

- [ ] 2.1 Update or add focused documentation/governance assertions so current install guidance remains synchronized and active `npx ... @timurproko/a1-install` examples cannot return outside immutable archives.
- [ ] 2.2 Verify `npm x -y -- @timurproko/a1-install --help` reaches the published installer, and verify all documented target forms preserve the existing installer grammar without changing runtime implementation.

## 3. Validate the documentation change

- [ ] 3.1 Run focused installer, documentation-governance, architecture, and strict OpenSpec checks; verify current guidance contains only the approved `npm x` forms and archived records remain unchanged.
