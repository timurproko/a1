# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- The session shell, its root, and composition compile without the `pinned` sub-port, and the architecture check fails when a file under `src/app` names `PiSessionPresentationSource` or `PiEngineAdapter`.
- `pi-session-presenters` is a registered owner that may import only the owned-UI contracts and both Pi adapters, and its tests live under `test/integrations/pi/session-presenters`.
- The model, session, tree, settings, models, and scoped-models selectors open, apply, and close as before in both custom-viewport and standard TUI modes.
- The models dialog and scoped-models selector share one refresh helper that times out after fifteen seconds with a cached-models notice and drops results after the dialog closes.
- Extension UI binding goes through `extensions.bindExtensionUi` with `OwnedUiExtensionUiPort`, and bare `a1` and `a1 pi` sessions start, render transcripts, and quit as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "extract-pi-session-presenters",
  "sourcePr": 731,
  "archive": "openspec/changes/archive/2026-10-09-extract-pi-session-presenters/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-extract-pi-session-presenters/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "58084d7035f51d770ea71ca4586ba22ca364a703",
  "acceptanceScenarios": [
    "The session shell, its root, and composition compile without the `pinned` sub-port, and the architecture check fails when a file under `src/app` names `PiSessionPresentationSource` or `PiEngineAdapter`.",
    "`pi-session-presenters` is a registered owner that may import only the owned-UI contracts and both Pi adapters, and its tests live under `test/integrations/pi/session-presenters`.",
    "The model, session, tree, settings, models, and scoped-models selectors open, apply, and close as before in both custom-viewport and standard TUI modes.",
    "The models dialog and scoped-models selector share one refresh helper that times out after fifteen seconds with a cached-models notice and drops results after the dialog closes.",
    "Extension UI binding goes through `extensions.bindExtensionUi` with `OwnedUiExtensionUiPort`, and bare `a1` and `a1 pi` sessions start, render transcripts, and quit as before."
  ],
  "archiveDigest": "c80f9d2e11f4506dbcf48e0572fb43f94f09a51ba395409bb104921aa19093ca",
  "specDigest": "5b77c058d5b4077031815d61163c624873520bfd015c67265196b3bf37c8e565",
  "tasksDigest": "f9a976bf7b0eb6c72569f34a4d320f7c57aff720afb0c452c3d5ccada83aba46",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
