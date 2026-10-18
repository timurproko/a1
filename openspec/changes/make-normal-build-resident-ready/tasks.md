## 1. Complete build contract

- [ ] 1.1 Split the existing managed/process-guardian build into an explicitly internal core entry while keeping the environment check first and native-independent npm lifecycle callers on that entry.
- [ ] 1.2 Extend the normal `npm run build` to prepare and build the current platform's release terminal host before generating the final runtime payload.

## 2. Local native prerequisite

- [ ] 2.1 Add deterministic selection of an explicit, cached, current-branch, or compatible default-branch CI terminal-library artifact without invoking workstation Zig implicitly.
- [ ] 2.2 Keep artifact verification and child environment bounded, propagate failures, and emit actionable stderr diagnostics without polluting build stdout.

## 3. Regression protection and guidance

- [ ] 3.1 Cover complete-build ordering, core lifecycle isolation, artifact selection/failure behavior, and stdout discipline with focused tests.
- [ ] 3.2 Update build/toolchain guidance to define the normal build as resident-ready and retain `./scripts/dev` as the interactive launcher.
