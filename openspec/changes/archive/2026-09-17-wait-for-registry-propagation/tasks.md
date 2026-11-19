## 1. Registry verification window

- [x] 1.1 In `.github/workflows/release.yml`, raise the "Verify the registry serves the validated bytes" loop to sixty attempts at ten-second intervals, named as constants, and log each unsuccessful attempt with its reason.
- [x] 1.2 In `docs/ci-release-runbook.md`, add a "Registry verification times out" entry explaining how to confirm the upload on the registry and that rerunning the failed jobs verifies the existing bytes without republishing.
- [x] 1.3 Validate the workflow: confirm the changed step parses with the repository's workflow checks and that the digest and `dist-tag` assertions are unchanged; record outcomes: the extracted step body passes `node --check`, `release-pipeline-policy`, `ci-release-runbook`, `impact-aware-validation-workflows`, and `validation-receipt-workflows` suites 31 passed, `check:docs-governance` OK, `openspec validate` valid.
