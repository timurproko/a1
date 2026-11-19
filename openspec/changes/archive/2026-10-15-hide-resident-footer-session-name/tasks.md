## 1. Route resident footer presentation

- [x] 1.1 Add an explicit footer presentation option that suppresses only the rendered session-name suffix while retaining the session name in the owned view model.
- [x] 1.2 Derive that option from the shell's resident-tab collaborator so direct, fallback, solo, and comparison compositions keep their current footer behavior.

## 2. Prove profile-specific behavior

- [x] 2.1 Add focused footer coverage showing resident rows omit the duplicate name while repository, branch, PR link, truncation, and other footer rows remain intact.
- [x] 2.2 Add shell-level coverage showing resident composition hides the suffix and direct single-agent composition continues to show it after session-name updates.

## 3. Complete focused evidence

- [x] 3.1 Run focused footer and resident-shell tests, type checking, and strict OpenSpec validation; record results and any known-gap disposition in implementation evidence.
- [x] 3.2 Review the final diff for session metadata loss, environment-based inference, tab-name regressions, direct-profile drift, and unrelated footer changes; document manual resident-versus-solo checks.
