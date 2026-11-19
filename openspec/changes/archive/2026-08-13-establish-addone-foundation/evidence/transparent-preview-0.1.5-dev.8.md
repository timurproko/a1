# Transparent Preview Publication Evidence

- Recorded: 2026-08-13
- Package: `@timurproko/addone@0.1.5-dev.8`
- Accepted source commit: `53f80cf0bbe7cfe4b4a1c5ce04c6d09f1c5cad19`
- Manual acceptance record: `93100f299f8d210cb905d7c66ad6aa729cb41d8c`
- Publication workflow: [Publish npm next preview run 31697515682](https://github.com/timurproko/addone/actions/runs/31697515682)
- Workflow trigger commit: `2e21caba7820d2a81068ba7f0c987503c0970cef`
- Workflow result: `success`
- Certification status: uncertified development preview; physical-host and cross-platform terminal certification deferred

## Exact artifact

The trusted-publishing workflow checked out the accepted source commit, ran the non-desktop release gates, packed once, matched the manually accepted artifact identity, published that tarball with provenance, and verified the registry result.

- Integrity: `sha512-LXTRmoLa/8M4yl+Qqka4B53hD/ZNVXw+1cw37HCpLSrnGaLRLXSYSBt/Q8mBfl/tJEOTK1gntU7+qLmQIHlklg==`
- SHA-1: `74edceab2e702d3dceed8e2bae769407032bed64`
- npm `next`: `0.1.5-dev.8`
- npm `latest`: `0.1.4`

A fresh registry query on 2026-08-13 returned the same version, integrity, SHA-1, and tags.

## Gates and command behavior

The publication run passed `npm run check`: typecheck, architecture policy, dependency policy, 28 test files/120 tests, and the release-gating N-1 update transitions. It then passed the standalone release gate (3 tests) and exact package-content checks before publication. The dependency-light version tests and hermetic `a1 update:next` CLI/update-transition tests were part of those accepted bytes and gates; no update command was run against the developer workstation.

## Decision

Transparent direct attachment is the selected development baseline for one foreground full-viewport Native Pi or generic CLI process. The child and physical terminal retain input/rendering ownership; AddOne retains foreground lease and lifecycle ownership. This capability intentionally has no AddOne-owned terminal surface, resident tabs, visual reconnection, or terminal-byte relay. Stable support claims remain blocked on the deferred physical-certification change. Arbitrary-CLI internal tabs require a separately planned composed-terminal capability.
