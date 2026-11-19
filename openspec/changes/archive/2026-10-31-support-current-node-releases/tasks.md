# Tasks

## 1. Accept current Node.js releases

- [x] 1.1 Replace the installer's enumerated Node.js gate with a numeric 22.19.0 floor that admits every newer major, with the runtime version injectable for tests.
- [x] 1.2 Declare `>=22.19.0` in the application and installer manifests and lockfile, and align the toolchain documentation and environment-prerequisite tests.

## 2. Explain an outdated runtime

- [x] 2.1 Report a too-old runtime as `a1 needs a newer Node.js: you have <version>, install 22.19 or later` from both installer error paths, keeping status 1 and every other failure line unchanged.
- [x] 2.2 Add installer tests for an older runtime, the 22.19.0 boundary, and a newer major.
