## 1. Make endpoint identity belong to a cohort

- [ ] 1.1 Derive the endpoint name and its metadata path from the runtime directory and the
  release identity together, so two live cohorts address two endpoints
- [ ] 1.2 Resolve which endpoint a launch attaches to from the active reference in cohort state
- [ ] 1.3 Keep one supervisor per endpoint identity, and keep the existing refusal to own an
  endpoint another live supervisor already owns

## 2. Let an update leave a live cohort alone

- [ ] 2.1 Stop requesting shutdown, draining, or terminating a cohort that runs from retained
  immutable content, and drop the live-instance override that made it possible
- [ ] 2.2 Keep the bounded shutdown for a live cohort running from the mutable installation, and
  say which session is ending and why
- [ ] 2.3 Commit the active reference as the update's ownership step, so the next launch starts on
  the installed release while working sessions continue

## 3. Retire a superseded cohort

- [ ] 3.1 Refuse new instances on a cohort that is no longer the active one
- [ ] 3.2 Exit and remove that cohort's own endpoint artifacts when its last instance exits
- [ ] 3.3 Retain the release a live cohort runs from until it exits

## 4. Reconcile and roll back with more than one cohort

- [ ] 4.1 Validate each cohort's endpoint on its own identity rather than assuming one endpoint
  file, and stop treating a second live cohort as stale ownership
- [ ] 4.2 Re-point the active reference on rollback without stopping a cohort that survived
- [ ] 4.3 Reconcile the endpoints of cohorts whose processes died, as the single endpoint is
  reconciled today

## 5. Validate and integrate

- [ ] 5.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 5.2 Cover the update path with tests: an update while a cohort has live instances leaves it
  running, a launch after it starts on the new release, a superseded cohort exits with its last
  instance, and a mutable-install cohort is still ended with a stated reason
- [ ] 5.3 Open the pull request and let CI validate
- [ ] 5.4 Record manual acceptance — update in one tab while an agent streams in another, and see
  the turn finish — then archive
