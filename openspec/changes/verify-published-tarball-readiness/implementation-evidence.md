# Implementation evidence

## Registry download readiness

- Reproduced npm E404 for the 0.2.7-dev.1307 application tarball while its version metadata returned 200; the installer tarball returned 200. The application download subsequently returned 200.
- Focused registry suite: 26 tests passed, covering both tarballs' delayed availability, SHA-512 and SHA-1 verification, URL restrictions, redirects, size limits, and aborted streams.
- Initial typecheck reached bin checking but lacked generated dist imports in this fresh checkout; build prerequisites will be generated before final typecheck.

## Published smoke diagnostics

- The harness now writes failure evidence before cleanup, isolates npm cache/log ownership, bounds diagnostic tails, redacts credential-bearing fields and known environment secrets, and preserves nonzero failure and exact successful transcript assertions.
- Focused fixtures exercise success and acquisition, installation, manifest, launcher, transcript, and spawn failures without network or product activation.

## Known gaps

No live nightly recovery or cross-platform installed-product certification is claimed by local fixtures. Native smoke remains authoritative after publication. Registry readiness at one point cannot guarantee perpetual availability from every npm edge. No live npm publishing, channel mutation, or user-state repair is performed by local tests.
