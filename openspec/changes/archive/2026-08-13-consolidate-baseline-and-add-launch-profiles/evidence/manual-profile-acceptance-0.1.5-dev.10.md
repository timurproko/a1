# Manual Launch-Profile Acceptance: 0.1.5-dev.10

## Exact candidate

- Package: `@timurproko/addone@0.1.5-dev.10`
- Source commit: `3904de4924544127f70554e6fa5db6268517fc3f`
- Tarball: `timurproko-addone-0.1.5-dev.10.tgz`
- Integrity: `sha512-XjwhIsCbZjJbAwFQjWLnSsSS6Lb21Uls1MhkQUXOAiJh5Fg7IfQI4Ol4gMUGuzxSzOf38Cor+F+zB8nHLh79Dg==`
- SHA-1: `4af9a7697ad79209214889a8c56f3bb19228fb65`
- SHA-256: `d8dded49ccc11e5c6c80d07a25e10b941b7ee6c5cf1f5f4fce5857f388530145`

## Manual result

On 2026-08-13, the user explicitly reported that manual testing worked for all requested launch-profile behavior.

Accepted mappings:

- bare `npm start` / future bare `a1` uses the AddOne agent profile at `~/.a1/agent`;
- `npm start -- pi` / future `a1 pi` uses vanilla Pi at `~/.pi/agent`;
- `npm start -- sandbox` / future `a1 sandbox` creates and uses `~/.a1/sandbox` with project resources untrusted for the run.

The user observed Pi's native trust dialog during bare AddOne launch and confirmed it as expected Pi-owned UI. A manual finding showed that the repository-local start script dropped the `sandbox` argument. Commit `ac503bf` corrected argument forwarding and added a regression test. The package was bumped from the superseded `0.1.5-dev.9` candidate to immutable `0.1.5-dev.10`; the user then reported all manual checks working.

No automated process launched, focused, drove, resized, or closed a terminal or injected desktop input.

## Automated result after correction

The exact `0.1.5-dev.10` source passed:

- build and typecheck;
- architecture and repository hygiene policy;
- deprecated dependency policy;
- 31 Vitest files and 155 tests, including local argument forwarding, profile initialization/environment/isolation, and transparent-terminal contracts;
- N-1 release/update transition gates;
- npm audit with zero vulnerabilities;
- all five main OpenSpec validations;
- strict validation of `consolidate-baseline-and-add-launch-profiles`.

Physical-host and cross-platform terminal certification remain explicitly deferred. This acceptance makes no stable support claim and no arbitrary interactive CLI multi-tab claim.
