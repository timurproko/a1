# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Plain Windows builds discover installed Rustup and Visual Studio C++ tools without manual shell initialization.
- Git Bash builds select Microsoft's x64 linker instead of Git's GNU utility and produce both verified native addons.
- Missing Windows prerequisites stop the build before cleaning or compiling and report an ordered explicit setup sequence.
- Build-child initialization does not install software, accept licenses, elevate privileges, or change persistent environment settings.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "bootstrap-windows-native-build",
  "sourcePr": 812,
  "archive": "openspec/changes/archive/2026-10-22-bootstrap-windows-native-build/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-22-bootstrap-windows-native-build/acceptance.md",
  "finalizedDate": "2026-10-22",
  "specBaseSha": "8791e02d5ae5567117ecd84513f68a2a74fa70c9",
  "acceptanceScenarios": [
    "Plain Windows builds discover installed Rustup and Visual Studio C++ tools without manual shell initialization.",
    "Git Bash builds select Microsoft's x64 linker instead of Git's GNU utility and produce both verified native addons.",
    "Missing Windows prerequisites stop the build before cleaning or compiling and report an ordered explicit setup sequence.",
    "Build-child initialization does not install software, accept licenses, elevate privileges, or change persistent environment settings."
  ],
  "archiveDigest": "fbef7c6d5f7cf02ed54606a685c95f3bd28427df56a46f1f11bbe1c297f77390",
  "specDigest": "ee873c9c6b5866ab976135fe4fdbdbb5e44526b3c6e4142c2dc0f4509ba01a19",
  "tasksDigest": "24edd29f6c2b6251694ee740e89f44261e2b0c4c257f0dbf2f692f1050eeb4e7",
  "evidenceDigest": "03a3b7b955afeeb547374e6cdd1c0b018a239ccdb99d9ea42047adf5ee4ef136",
  "knownGaps": []
}
```
