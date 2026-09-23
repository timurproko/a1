## 1. Profile-specific command metadata

- [x] 1.1 Give bare A1 hint-free `thinking` and `login` built-in entries while preserving their exact descriptions, ordering, and the pinned comparison entries.
- [x] 1.2 Omit the provider-login argument hint from bare runtime workflow metadata while retaining provider argument options and comparison-mode metadata.

## 2. Regression coverage

- [x] 2.1 Add focused rendered-row assertions that bare A1 shows only `Set thinking level` and `Configure provider authentication`, while `a1 pi` retains `<level>` and `<provider>` argument hints.
- [x] 2.2 Verify direct thinking-level arguments and provider argument suggestions remain available and unrelated hinted commands/resources retain their existing presentation.

## 3. Validation and handoff

- [x] 3.1 Run typechecking and focused component, resource-catalog, and workflow tests covering command catalogs and argument completion; record any gap explicitly.
- [x] 3.2 Build the reconciled candidate and provide a color-preserving manual check through `./scripts/dev` and `./scripts/dev pi`.
- [x] 3.3 Verify bare A1 omits both prefixes, both argument workflows still operate, and the comparison profile remains unchanged.
