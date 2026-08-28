## 1. Specify and document the command surface

- [x] 1.1 Define canonical stable, development-channel, numbered-preview, exact-preview, and model-refresh forms
- [x] 1.2 Define explicit help, silent unsupported grammar, and concise recognized-command failures
- [x] 1.3 Define the Pi model-refresh alias and pinned-runtime refusals
- [x] 1.4 Update README without advertising deferred commands

## 2. Implement parsing and dispatch

- [x] 2.1 Add `help` and silent `noop` parser outcomes
- [x] 2.2 Replace colon update parsing with `--develop [preview-or-version]`
- [x] 2.3 Remove `update self` and every colon compatibility path without deprecation output
- [x] 2.4 Route `a1 pi update --models` to the existing A1 model refresh operation
- [x] 2.5 Keep recognized malformed grammar and pinned-runtime mutation as focused errors without appended help

## 3. Verify behavior

- [x] 3.1 Cover every advertised command and development selector
- [x] 3.2 Prove unknown and removed forms exit successfully with no output or handler invocation
- [x] 3.3 Cover invalid combinations, exact diagnostics, and pinned Pi refusals
- [x] 3.4 Update built-CLI isolation and repository documentation tests
- [x] 3.5 Let pull-request CI run the required validation tiers

## 4. Deliver implementation separately

- [x] 4.1 Merge this specification/README change before implementation starts
- [x] 4.2 Create a fresh detached implementation worktree from updated `origin/develop`
- [x] 4.3 Open a separate implementation pull request and leave it for manual acceptance
