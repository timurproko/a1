## 1. Gate publication on downloadable validated tarballs

- [ ] 1.1 Stream and hash both exact registry tarballs with bounded URL, request, and size checks while retaining ingestion polling.
- [ ] 1.2 Add focused registry readiness and byte-integrity regression tests and update the operator runbook.

## 2. Preserve published-installer failure diagnostics

- [ ] 2.1 Write bounded sanitized failure evidence before fixture cleanup using an isolated npm cache and unchanged success transcript checks.
- [ ] 2.2 Add focused smoke harness regression tests and record implementation evidence and known-gap disposition.

## 3. Promote only exercised published candidates

- [ ] 3.1 Upload under a staging tag and gate trusted next/latest promotion and release completion on every native smoke lane.
- [ ] 3.2 Exercise exact staged installation, predecessor update, and launch without selecting the old public tag; cover promotion refusal, retries, and workflow wiring.

## 4. Preserve callable launchers across updater failures

- [ ] 4.1 Retry atomic journal and recovery sidecar/launcher replacement on bounded Windows sharing failures without pre-deleting destinations.
- [ ] 4.2 Keep detached recovery settlement running despite journal callback failures and cover failure, cancellation, and transient/persistent replacement errors.
