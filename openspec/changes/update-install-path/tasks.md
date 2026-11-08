# Tasks

## 1. Installer port

- [ ] 1.1 Add the `UpdateInstaller` port and `createProtectedUpdateInstaller` (`update-installer.ts`), built from the existing preflight, recovery-release, protected-replacement, rollback and maintenance functions.

## 2. One install path

- [ ] 2.1 Make `runSelfUpdate` run every step through the installer, remove the branches on `runner`, `lifecycle` and `packageReplacement` and the plain `npm install` path, replace the `packageReplacement`, `npmCliResolver` and `maintenance` options with `installer`, and split the body under the long-function threshold.

## 3. Tests

- [ ] 3.1 Give the update tests a fake installer whose replacement runs `npm install` through the scripted runner, and move the preflight, maintenance and replacement-outcome tests onto installer steps.

## 4. Baselines

- [ ] 4.1 Lower the size ratchet and re-pin the startup graph if it changes.
