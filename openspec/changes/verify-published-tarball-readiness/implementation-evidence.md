# Implementation evidence

## Registry download readiness

- Reproduced npm E404 for the 0.2.7-dev.1307 application tarball while its version metadata returned 200; the installer tarball returned 200. The application download subsequently returned 200.
- Focused registry suite: 26 tests passed, covering both tarballs' delayed availability, SHA-512 and SHA-1 verification, URL restrictions, redirects, size limits, and aborted streams.
- Initial typecheck reached bin checking but lacked generated dist imports in this fresh checkout; build prerequisites will be generated before final typecheck.

## Published smoke diagnostics

- The harness now writes failure evidence before cleanup, isolates npm cache/log ownership, bounds diagnostic tails, redacts credential-bearing fields and known environment secrets, and preserves nonzero failure and exact successful transcript assertions.
- Focused fixtures exercise success and acquisition, installation, manifest, launcher, transcript, and spawn failures without network or product activation.

## Staged channel promotion

- Exact uploads now use a1-staging; a separate trusted promotion job depends on all native published-pair jobs. Existing package bytes no longer skip native smoke or promotion recovery.
- Native smoke uses a fixture-local npm discovery bridge to test the exact stable candidate without moving latest, then exercises a distinct predecessor's real update command and candidate launch in another prefix.
- Focused promotion suite: 9 tests passed, including refusal after failed/cancelled/skipped smoke, installer-first promotion, partial promotion reconciliation, downgrade refusal, and workflow dependencies. Smoke suite: 10 tests passed, including stable/develop predecessor-update failures and real bridge forwarding.
- Typecheck passes after generating dist through build:core. Strict OpenSpec validation passes.

## Known gaps

No live nightly recovery or cross-platform installed-product certification is claimed by local fixtures. Native smoke remains authoritative after publication. Registry readiness at one point cannot guarantee perpetual availability from every npm edge. No live npm publishing, channel mutation, or user-state repair is performed by local tests. Package maintainers must enable Allow npm dist-tag on both existing trusted publisher entries before live promotion can succeed; code does not alter those permissions. This remains an explicit deployment prerequisite, not claimed live evidence.
