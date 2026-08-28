## 1. Make endpoint identity belong to a cohort

- [x] 1.1 Derive the endpoint name and its metadata path from the runtime directory and the
  release identity together, so two live cohorts address two endpoints
- [x] 1.2 Resolve which endpoint a launch attaches to from the active reference in cohort state
- [x] 1.3 Keep one supervisor per endpoint identity, and keep the existing refusal to own an
  endpoint another live supervisor already owns
- [x] 1.4 Recognize the single endpoint published by a release that predates cohort-scoped
  identity, so a session started by that release keeps working across the first launch that
  knows about cohorts

## 2. Let an update leave a live cohort alone

- [x] 2.1 Stop requesting shutdown, draining, or terminating a cohort that runs from retained
  immutable content, and drop the live-instance override that made it possible
- [x] 2.2 Keep the bounded shutdown for a live cohort running from the mutable installation, and
  say which session is ending and why
- [x] 2.3 Commit the active reference as the update's ownership step, so the next launch starts on
  the installed release while working sessions continue

## 3. Retire a superseded cohort

- [x] 3.1 Refuse new instances on a cohort that is no longer the active one
- [x] 3.2 Exit and remove that cohort's own endpoint artifacts when its last instance exits
- [x] 3.3 Retain the release a live cohort runs from until it exits

## 4. Reconcile and roll back with more than one cohort

- [x] 4.1 Validate each cohort's endpoint on its own identity rather than assuming one endpoint
  file, and stop treating a second live cohort as stale ownership
- [x] 4.2 Re-point the active reference on rollback without stopping a cohort that survived
- [x] 4.3 Reconcile the endpoints of cohorts whose processes died, as the single endpoint is
  reconciled today

## 5. Validate and integrate

- [x] 5.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [x] 5.2 Cover what changed with tests: cohort endpoints are distinct and stable and an override
  still pins one, an update leaves a cohort running from a retained release alone, the ownership
  plan ends only a session running from the package being replaced, and a superseded cohort
  retires while an active one keeps serving
- [ ] 5.3 Cover the launch after an update end to end: a new session starts on the installed
  release while an older cohort is still working
- [ ] 5.4 Open the pull request and let CI validate
- [ ] 5.5 Record manual acceptance — update in one tab while an agent streams in another, and see
  the turn finish — then archive
