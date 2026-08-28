## 1. Make active contracts honest

- [x] 1.1 Move the app route surface/host contract to `ui-apps`, update composition and shell imports, preserve the Pi integration compatibility export, and verify architecture ownership tests cover the dependency
- [x] 1.2 Make Pi TUI and Pi shell component ports extend the canonical presentation component lifecycle without changing runtime shapes; verify focused type/adapter tests still use ordinary structural doubles
- [x] 1.3 Route app rendering through `FrameCache` and expose the optional app render-cache contract; verify same-revision/same-size frames are reused, changed revisions and sizes re-render, and apps without revisions remain always stale
- [x] 1.4 Validate the settings shortcut declaration assembly in production so duplicate declarations fail before input dispatch

## 2. Separate viewport interaction from shell rendering

- [x] 2.1 Add a focused session viewport controller owning viewport state, scrollbar configuration, pointer latches, selection auto-scroll, activity expiry, editor pointer geometry, and viewport input routing
- [x] 2.2 Change the shell root to assemble document/dock/theme inputs and delegate composition and interaction lifecycle to the controller, preserving its existing public methods for the shell
- [x] 2.3 Add focused controller tests for keyboard passthrough, wheel routing, editor selection ownership, transcript copy, timer cleanup, and lifecycle reset while retaining existing session-shell behavior coverage

## 3. Govern the responsibility boundary

- [x] 3.1 Add repository governance coverage proving viewport input/timer state remains in the controller and does not return to `OwnedUiSessionShellRoot`
- [x] 3.2 Update architecture documentation with the canonical component lifecycle, neutral route owner, and session shell/controller responsibilities
- [x] 3.3 Run optional typechecking only if needed for debugging, commit the behavior-preserving implementation, push `refactor/owned-ui-composition`, and open a separate PR against `develop` (historically auto-merged under the former policy; future refactor/code PRs require local acceptance and manual merge)
- [ ] 3.4 Read and report the GitHub development validation result; fix the PR before starting unrelated work if it is red
