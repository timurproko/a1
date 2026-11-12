## 1. Preserve selected-release startup capability validation across full and compact restart evidence

- [x] 1.1 Add a release-owner characterization using real materialization, certification, and compact restart recovery whose files contain only `bin/ui.js` while its authenticated full manifest carries the startup parser.
- [x] 1.2 Make the common selected-release startup compatibility gate await authenticated complete manifest resolution when selected inventory cannot establish payload support, binding the read to that release's identity and managed store.
- [x] 1.3 Keep successful full-inventory validation and exact literal child argv propagation for color-only, literal-only, and combined payloads; cover cold and at least two repeated warm launches after certification.
- [x] 1.4 Preserve restart seal version 1, existing minimal executable entries, and reader/identity/dependency authority without optional-feature schema migration or installed-package capability claims.

## 2. Retain fail-closed old-release handling and bounded ordinary startup behavior

- [x] 2.1 Add unsupported and mismatched-evidence startup regressions that reject color/literal payloads before UI spawn and prevent another supported release or installed candidate from authorizing the selected unsupported release.
- [x] 2.2 Extend release-owner selection fixtures for update-prior selection, retained installation-failure fallback, newer-active/activation-race selection, and bounded reselection with independently resolved per-release support.
- [x] 2.3 Add deterministic assertions for zero support-only manifest reads on no-payload launches and unchanged restart operation boundaries, excluding recursive discovery/full rehash solely for capability resolution.
- [x] 2.4 Preserve the existing first-frame trust/editor color, Default/Current non-persistence, literal submission, live API/peer isolation, replacement, discovery, and comparison contracts through focused owner tests; add assertions only where existing coverage leaves a concrete gap.
- [x] 2.5 Reconcile implementation disposition and remaining gaps in the design, and clarify maintained release-support documentation or diagnostics only where the repair requires it, without adding consumer workarounds or implying unperformed physical/remote smoke.
