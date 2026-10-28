## 1. Explicit solo session grammar and transport

- [ ] 1.1 Accept only the supported solo `--session`/optional `--session-dir` forms and advertise them in help, retaining fresh argument-free solo and rejecting malformed forms before startup.
- [ ] 1.2 Carry the solo selection through launch intent, release/bootstrap retry, containment, and development entry into the existing direct owned UI without resident discovery.
- [ ] 1.3 Cover packaged and development entry points, both option orders, path quoting, invalid combinations, release handoff, and unaffected tabbed/Pi forms.

## 2. Session ownership and restoration

- [ ] 2.1 Reuse the existing A1-profile Pi session resolver and canonical session-writer lease for solo selection, preserving ID, cwd, history, and same-pin context.
- [ ] 2.2 Keep existing session-writer conflict handling unchanged: never start a second writer, fork implicitly, stop a tab, or transfer ownership when selecting a solo session.
- [ ] 2.3 Cover exited solo sessions in default and custom directories, occupied-session safety, unknown/malformed targets, and unchanged resident reattach/focus behavior.

## 3. Resume hint and delivery

- [ ] 3.1 Print a solo-mode normal and unclean-exit resume command from the owned shell with existing quoting and only when session metadata is durable; retain existing tabbed hints and the running-agent `run a1` notice.
- [ ] 3.2 Cover copy-pastable exited-solo hints (including custom session directories) through the public CLI, unchanged resident messages, and relevant user guidance.
- [ ] 3.3 Run focused typecheck, tests, strict OpenSpec validation, and applicable governance; disposition any concrete gaps before readiness.
