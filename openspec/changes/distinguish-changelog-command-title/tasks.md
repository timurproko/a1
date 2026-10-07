## 1. Distinguish owned changelog titles

- [ ] 1.1 Define separate owned labels for the on-demand `Changelog` screen and automatic `What's New` release note, then select them from the changelog route's existing command-versus-supplied-document context; verify the explicit command and startup document keep their existing content providers and route lifecycle.
- [ ] 1.2 Update focused owned-route tests to assert `/changelog` renders `Changelog`, a supplied startup release-note document renders `What's New`, and command-path load failures name `Changelog`; verify the focused route-host test passes.

## 2. Reconcile presentation declarations

- [ ] 2.1 Update affected presenter inventory and user-facing manual-check documentation so they describe the distinct `Changelog` command and `What's New` startup titles; verify repository governance checks report no stale title declaration.
- [ ] 2.2 Run focused typechecking and the changelog/reference-screen test scopes, then build the interactive candidate and hand off `/changelog` plus an eligible post-update launch for manual title verification; record implementation evidence and any known-gap disposition before finalization.
