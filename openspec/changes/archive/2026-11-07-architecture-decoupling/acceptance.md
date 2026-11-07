# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- No file under `src/app` imports `src/integrations/pi`; the architecture gate rejects such an import, and the shell gets the theme, terminal runtime, and Pi component factories from the presenters composition injects.
- Every exported value under `src/` has a production consumer, enforced by the architecture gate; test-only helpers are private and their cases run through the public owner.
- The bare/comparison product mode has one name and type from launch selection to the shell; the Update setting offers Auto and Manual.
- One neutral theme contract is the only theme module imported outside the Pi adapters, and governance tests are one fixture-driven test per script that is line-ending neutral.
- Pre-pivot residue is gone: retired capability specs, dead gate rules, `node-pty`, the interaction-parity matrix, Rust/Zig tooling, the settings upgrade chain, and supervisor-era names.
- Size ratchet, shell: presenter 77 methods / 52 fields to 76 / 44 and its constructor 320 to 202 lines; render root 85 methods to 76 with its constructor entry removed.
- Size ratchet, settings and adapters: `SettingsApp` 42 / 28 to 33 / 19 with `render` removed; `PiEngineAdapter` 42 to 40 methods; `PiTuiRuntimeAdapter` 56 / 26 to 54 / 24; the settings manager and resolver entries removed.
- Startup graph: 187 to 192 files and 1,767,444 to 1,754,711 source bytes; the added files are the injected Pi component factory, the neutral component and clipboard/suggestion concern modules.
- Known Windows failures that also fail on `develop` are unchanged: two quit-outro lifecycle cases, three link cases, one paste case, event-frame parity, one shell-components case, and the rendering budget gate.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "architecture-decoupling",
  "sourcePr": 879,
  "archive": "openspec/changes/archive/2026-11-07-architecture-decoupling/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-07-architecture-decoupling/acceptance.md",
  "finalizedDate": "2026-11-07",
  "specBaseSha": "e9c99ad02e5ed2f45cb4fbdf7013dd6386ab78ad",
  "acceptanceScenarios": [
    "No file under `src/app` imports `src/integrations/pi`; the architecture gate rejects such an import, and the shell gets the theme, terminal runtime, and Pi component factories from the presenters composition injects.",
    "Every exported value under `src/` has a production consumer, enforced by the architecture gate; test-only helpers are private and their cases run through the public owner.",
    "The bare/comparison product mode has one name and type from launch selection to the shell; the Update setting offers Auto and Manual.",
    "One neutral theme contract is the only theme module imported outside the Pi adapters, and governance tests are one fixture-driven test per script that is line-ending neutral.",
    "Pre-pivot residue is gone: retired capability specs, dead gate rules, `node-pty`, the interaction-parity matrix, Rust/Zig tooling, the settings upgrade chain, and supervisor-era names.",
    "Size ratchet, shell: presenter 77 methods / 52 fields to 76 / 44 and its constructor 320 to 202 lines; render root 85 methods to 76 with its constructor entry removed.",
    "Size ratchet, settings and adapters: `SettingsApp` 42 / 28 to 33 / 19 with `render` removed; `PiEngineAdapter` 42 to 40 methods; `PiTuiRuntimeAdapter` 56 / 26 to 54 / 24; the settings manager and resolver entries removed.",
    "Startup graph: 187 to 192 files and 1,767,444 to 1,754,711 source bytes; the added files are the injected Pi component factory, the neutral component and clipboard/suggestion concern modules.",
    "Known Windows failures that also fail on `develop` are unchanged: two quit-outro lifecycle cases, three link cases, one paste case, event-frame parity, one shell-components case, and the rendering budget gate."
  ],
  "archiveDigest": "0144cc6b689a47da05ba22ba5cab252a597125c0ef3d2540de9a9f5a37c46497",
  "specDigest": "0f1c80ed5d7122f86e574907c2200e92b98e5c0c1fa6e8e0e03f606eac249222",
  "tasksDigest": "22565f57e988fcef226c0cf11bbf1a7e975765ed4d3bde8f6bfdda68a194f525",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
