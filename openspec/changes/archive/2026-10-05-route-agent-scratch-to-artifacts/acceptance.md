# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Agent-created PR body files and other selected delivery scratch paths resolve beneath the linked worktree's `.artifacts/` root instead of an OS/user temporary location or another checkout.
- Scratch remains ignored, uncommitted, non-authoritative, secret-free, and removable only through the existing guarded `.artifacts/` cleanup boundary.
- Tool-internal, product-runtime, and hermetic-test temporary storage retains its existing ownership and behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "route-agent-scratch-to-artifacts",
  "sourcePr": 676,
  "archive": "openspec/changes/archive/2026-10-05-route-agent-scratch-to-artifacts/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-route-agent-scratch-to-artifacts/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "8e7867ec40e28860b58e3a3dbe316ff67895ede9",
  "acceptanceScenarios": [
    "Agent-created PR body files and other selected delivery scratch paths resolve beneath the linked worktree's `.artifacts/` root instead of an OS/user temporary location or another checkout.",
    "Scratch remains ignored, uncommitted, non-authoritative, secret-free, and removable only through the existing guarded `.artifacts/` cleanup boundary.",
    "Tool-internal, product-runtime, and hermetic-test temporary storage retains its existing ownership and behavior."
  ],
  "archiveDigest": "db63a7d1244c21fc7e6034b9cc9f88e0066af6c0f874af60894c9118a6988762",
  "specDigest": "c7c43d73e829a361b38e079fd288d3bdab386ba823560498949b882b081e9c5d",
  "tasksDigest": "72dc31e021aa214c760a77f1846846d92d19809060461754a84cfaf26e98c132",
  "evidenceDigest": "1d5d43cb2571f3694df287b244401135555e233692ad960b7fb315053b654a81",
  "knownGaps": []
}
```
