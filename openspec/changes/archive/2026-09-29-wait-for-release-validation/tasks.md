## 1. Publisher authorization

- [x] 1.1 Accept dispatch wrappers by the caller's `workflow_dispatch` event and exact default-branch workflow identity, and pin it with a policy test.

## 2. Release command

- [x] 2.1 Print the validation run link, wait for the run, and print the draft edit link only after success; report failed jobs otherwise.
- [x] 2.2 Put every link on its own line and suppress git fetch and gh output noise.

## 3. Proof

- [x] 3.1 Cover waiting, failure withholding, and link lines in command and client tests.
- [x] 3.2 Update README, runbook, and toolchain documentation.
- [x] 3.3 Record evidence in design.md.
