## 1. State the resolution instead of arranging it

- [x] 1.1 Declare the `#pi-tui` alias in the package manifest, naming pinned Pi's
  copy first and the ordinarily-resolved copy as fallback
- [x] 1.2 Point every A1 module at the alias
- [x] 1.3 Teach the architecture check that the alias is a Pi import, so it stays
  inside the adapter boundary

## 2. Stop rewriting the installed tree

- [x] 2.1 Replace the repair with a resolution comparison that reports a split
- [x] 2.2 Remove the install-time repair and its manifest wiring
- [x] 2.3 Rewrite the identity tests around resolution rather than file layout

## 3. Validate and integrate

- [x] 3.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 3.2 Open the pull request and let CI validate
- [ ] 3.3 Record manual acceptance — an extension's surface renders, and a
  deliberately broken alias reports the split at launch — then archive
