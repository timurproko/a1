## 1. Specify and document the command surface

- [x] 1.1 Define canonical stable, development-channel, numbered-preview, exact-preview, and model-refresh forms
- [x] 1.2 Define explicit help, silent unsupported grammar, and concise recognized-command failures
- [x] 1.3 Define the Pi model-refresh alias and pinned-runtime refusals
- [x] 1.4 Update README without advertising deferred commands

## 2. Implement parsing and dispatch

- [ ] 2.1 Add `help` and silent `noop` parser outcomes
- [ ] 2.2 Replace colon update parsing with `--develop [preview-or-version]`
- [ ] 2.3 Remove `update self` and every colon compatibility path without deprecation output
- [ ] 2.4 Route `a1 pi update --models` to the existing A1 model refresh operation
- [ ] 2.5 Keep recognized malformed grammar and pinned-runtime mutation as focused errors without appended help

## 3. Verify behavior

- [ ] 3.1 Cover every advertised command and development selector
- [ ] 3.2 Prove unknown and removed forms exit successfully with no output or handler invocation
- [ ] 3.3 Cover invalid combinations, exact diagnostics, and pinned Pi refusals
- [ ] 3.4 Update built-CLI isolation and repository documentation tests
- [ ] 3.5 Let pull-request CI run the required validation tiers

## 4. Deliver implementation separately

- [ ] 4.1 Merge this specification/README change before implementation starts
- [ ] 4.2 Create a fresh detached implementation worktree from updated `origin/develop`
- [ ] 4.3 Open a separate implementation pull request and leave it for manual acceptance
