## 1. Report the copy as it happens

- [x] 1.1 Let the activation coordinator forward the release store's existing
  per-file reports to its caller
- [x] 1.2 Drive the bar across the copy span from those reports

## 2. Stop the creep from impersonating a milestone

- [x] 2.1 Rest a whole point below the next milestone instead of half a point
- [x] 2.2 Move the activation milestones above the copy span

## 3. Keep the detail out of the terminal

- [x] 3.1 Restate the launch/update output boundary so it forbids per-file output
  rather than forbidding the progress hook the bar needs
- [x] 3.2 Cover a moving copy span, monotonic progress, and a creep that stays
  below its milestone in `test/foundation/release`

## 4. Validate and integrate

- [x] 4.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 4.2 Open the pull request and let CI validate
- [ ] 4.3 Record manual acceptance — watch `a1 update` cross the copy span — then archive
