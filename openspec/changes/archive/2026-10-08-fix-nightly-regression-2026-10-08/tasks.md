## 1. Reproduce

- [x] 1.1 Identify the exact Linux and macOS failure as the unapproved disposable-root link assertion fulfilling before inspection instead of rejecting with `content-link`.
- [x] 1.2 Trace the failure to `8e09390e`, which introduced a directory-only fixture ignore rule alongside a cross-platform symlink assertion.

## 2. Fix

- [x] 2.1 Make the fixture ignore `.artifacts-user` regardless of file type while leaving production cleanup behavior, assertions, budgets, timeouts, and coverage unchanged.
- [x] 2.2 Preserve the existing cross-platform test as regression evidence for unapproved disposable-root links reaching fail-closed inspection.

## 3. Prove

- [x] 3.1 Run the focused disposable-root link test and record implementation evidence, pre-finalization PR Full regression observations, failed owners and lanes, and known-gap disposition under Evidence in design.md.

After finalization, the exact-head PR Full regression lanes and Development validation required must pass before manual handoff. Report final run/head/selection in Actions and handoff, not another committed design edit. Standalone dispatch is diagnostic, not a replacement for selected PR checks. Numbered-package nightly recovery remains independent.
