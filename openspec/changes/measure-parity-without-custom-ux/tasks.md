## 1. Measure the layer, not the product

- [x] 1.1 Add a way to compose A1 with every owned surface switched off, built from the product's own
  composition rather than beside it, and use it for the parity run
- [x] 1.2 Add a check that fails when the parity entry point stops being the product's composition, so a
  parity run cannot drift into measuring itself
- [x] 1.3 Point `scripts/run-pi-terminal-parity.mjs` at that composition and require all 55 checkpoints to
  match, deleting any notion of a superseded or excluded checkpoint

## 2. Verify what a replacement promises

- [x] 2.1 Assert directly that every setting the engine reports is reachable from the settings screen,
  failing with the name of anything missing
- [ ] 2.2 Add the failure tests: an undeclared divergent surface, and an addition that displaces a pinned
  surface

## 3. Run it when it is useful

- [x] 3.1 Run parity on every merge into `develop`, on Linux, and keep it in the publish gates
- [x] 3.2 Leave it out of the required pull request check, and make it requestable for one pull request
- [x] 3.3 On failure, print the side-by-side diff and retain both sides' checkpoint snapshots as artifacts

## 4. Verify the promises the launch profiles already make

- [ ] 4.1 Test that `a1 sandbox` reads and writes only its own profile root and leaves the vanilla profile
  untouched
- [ ] 4.2 Smoke-test that `a1 pi` launches and exits cleanly

## 5. Validate and integrate

- [ ] 5.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 5.2 Run parity once by hand and confirm it passes with the owned surfaces off
- [ ] 5.3 Open the pull request and let CI validate
- [ ] 5.4 Record manual acceptance, then archive
