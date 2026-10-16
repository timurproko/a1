# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- When a tab's holder and child have already exited, `a1 tabs host stop` reports the host as stopped and lists that tab as released, and no resident server keeps running.
- A tab whose holder or child is still alive is still stopped through verified termination, as before.
- When a tab's process state can't be verified, host stop keeps that tab remaining with the reason `unverifiable` and doesn't report the host as stopped.
- A refused host stop names each remaining tab and why it stayed, and the resident-tabs chaos report keeps those reasons.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-host-stop-reaping",
  "sourcePr": 786,
  "archive": "openspec/changes/archive/2026-10-16-resident-host-stop-reaping/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-resident-host-stop-reaping/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "ab2d6f5834c91e1c39b628c7ba4b3483b0cfb556",
  "acceptanceScenarios": [
    "When a tab's holder and child have already exited, `a1 tabs host stop` reports the host as stopped and lists that tab as released, and no resident server keeps running.",
    "A tab whose holder or child is still alive is still stopped through verified termination, as before.",
    "When a tab's process state can't be verified, host stop keeps that tab remaining with the reason `unverifiable` and doesn't report the host as stopped.",
    "A refused host stop names each remaining tab and why it stayed, and the resident-tabs chaos report keeps those reasons."
  ],
  "archiveDigest": "afeae198c952cc7c1ae82b0ccd8161cf8a43d72fc19fe64fb2db4f1b57bb5cba",
  "specDigest": "dff19306b2de309c8c7f12adcc2640d2e22de95953d6d8a34da8824929bbd200",
  "tasksDigest": "d184e2434270e3bed415c1cf89ac38f297c75c900bc33b50b785b0ebe2f2e95d",
  "evidenceDigest": "92fd38fd327b33834880c611489840bed3bd9f387ea044f06e9b55f045694b47",
  "knownGaps": []
}
```
