# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A standby holder that outlives its server exits within its handshake deadline after the next server refuses it, and no console window flashes while it does.
- A tab holder whose server is gone keeps requesting a replacement with a growing interval and is re-admitted with its tab intact when one starts.
- When the resident server exits idle or on request, no standby holder process remains afterwards.
- `npm run build` in a checkout with a running development instance leaves none of its processes behind and prints nothing about the stop unless something survived.
- Leaving a `./scripts/dev` session ends that checkout's supervisor, server, holders, and tabs; installed resident tabs still survive a detached `a1`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-process-hygiene",
  "sourcePr": 832,
  "archive": "openspec/changes/archive/2026-10-24-resident-process-hygiene/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-resident-process-hygiene/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "14caed95de8937409bd4153a8880e7b77767f047",
  "acceptanceScenarios": [
    "A standby holder that outlives its server exits within its handshake deadline after the next server refuses it, and no console window flashes while it does.",
    "A tab holder whose server is gone keeps requesting a replacement with a growing interval and is re-admitted with its tab intact when one starts.",
    "When the resident server exits idle or on request, no standby holder process remains afterwards.",
    "`npm run build` in a checkout with a running development instance leaves none of its processes behind and prints nothing about the stop unless something survived.",
    "Leaving a `./scripts/dev` session ends that checkout's supervisor, server, holders, and tabs; installed resident tabs still survive a detached `a1`."
  ],
  "archiveDigest": "8aa1557953eb05cf2c136a74ff3900ddee1f6722b10f797ac74777d484fc094d",
  "specDigest": "31567262d6584998916e22689315ac205fb4762f050e54ca55247bd4eb5d50d9",
  "tasksDigest": "280b96db3990e27b04d6bc9a6f5c80bd41cb3f0951bc191175212522e92b33ea",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
