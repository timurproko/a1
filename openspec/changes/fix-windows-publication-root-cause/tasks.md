## 1. Hosted published-pair diagnosis

- [ ] Add an explicit diagnostic-only workflow route for an existing immutable published pair, with no npm writes or publication credentials.
- [ ] Retain worker stderr, exception, and exit information while leaving predecessor and candidate package bytes unchanged.
- [ ] Add focused contracts for diagnostic routing, capture, and redaction.

## 2. Root-cause repair

- [ ] Correct the failing boundary identified by native reproduction and preserve real predecessor-owned update and promotion assertions.
- [ ] Add regression coverage that reproduces the identified failure and distinguishes it from a successful install.
- [ ] Print smoke phases and bound a stalled update to five minutes while retaining safe failure settlement.
- [ ] Document the regression introduction, failure mechanism, earlier repairs, observed outcomes, and explicit remaining gaps.
