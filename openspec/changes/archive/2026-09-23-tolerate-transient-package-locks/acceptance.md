# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A file under the package tree that is held for a few seconds after a session ends no longer fails the update; the update proceeds once the holder lets go.
- A tree that stays held for the whole window fails with a diagnostic that names the package path, the kinds of program that hold it, and that nothing was changed and the update can be run again.
- A rename refused for a reason other than a hold fails at once without waiting and says the package could not be verified.
- A holder that appears while the tree wears the probe name is waited out, and if the tree cannot be restored the diagnostic names where it is and where it belongs.
- The existing self-update, live-cohort, process-exit, and CLI update behaviour is unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "tolerate-transient-package-locks",
  "sourcePr": 557,
  "archive": "openspec/changes/archive/2026-09-23-tolerate-transient-package-locks/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-tolerate-transient-package-locks/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "e904bb37b6c1f5664fb90a33e8a9c7118a25ce0f",
  "acceptanceScenarios": [
    "A file under the package tree that is held for a few seconds after a session ends no longer fails the update; the update proceeds once the holder lets go.",
    "A tree that stays held for the whole window fails with a diagnostic that names the package path, the kinds of program that hold it, and that nothing was changed and the update can be run again.",
    "A rename refused for a reason other than a hold fails at once without waiting and says the package could not be verified.",
    "A holder that appears while the tree wears the probe name is waited out, and if the tree cannot be restored the diagnostic names where it is and where it belongs.",
    "The existing self-update, live-cohort, process-exit, and CLI update behaviour is unchanged."
  ],
  "archiveDigest": "0177c557409b7e7163f4945f8e80a98d59c84b4126303f23f6fef21f1b7cd95f",
  "specDigest": "1e52c9155d425c36106c00501be84975e609e5cda1be91f5bb63e955fb15a1b3",
  "tasksDigest": "6efc490290ce3a24c4976ea89efdb4cd6ead92e7defbd172afc492d2229030a8",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
