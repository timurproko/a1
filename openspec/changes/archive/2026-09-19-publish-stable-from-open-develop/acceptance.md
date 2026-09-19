# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run release -- patch` on a `develop` declaring `0.1.8-dev` dispatches stable publication of `0.1.8` for that exact commit, then opens exactly one PR `chore/release-0.1.9-dev` and waits for its manual merge; no `0.1.8` commit reaches `develop`.
- A stable Release run stamps the requested version before packing, publishes the packed `0.1.8`, and writes `v0.1.8`, the GitHub Release, and `master` at the open development commit; a request without a final version, or a source not declaring `x.y.z-dev`, fails before building.
- The helper refuses a `develop` declaring a stable or numbered version before any Git operation, and a publication failure leaves `develop` untouched with no reopening PR.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "publish-stable-from-open-develop",
  "sourcePr": 521,
  "archive": "openspec/changes/archive/2026-09-19-publish-stable-from-open-develop/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-publish-stable-from-open-develop/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "d38b9f927d88d5d0b19477575cbb3a268c25a3a4",
  "acceptanceScenarios": [
    "`npm run release -- patch` on a `develop` declaring `0.1.8-dev` dispatches stable publication of `0.1.8` for that exact commit, then opens exactly one PR `chore/release-0.1.9-dev` and waits for its manual merge; no `0.1.8` commit reaches `develop`.",
    "A stable Release run stamps the requested version before packing, publishes the packed `0.1.8`, and writes `v0.1.8`, the GitHub Release, and `master` at the open development commit; a request without a final version, or a source not declaring `x.y.z-dev`, fails before building.",
    "The helper refuses a `develop` declaring a stable or numbered version before any Git operation, and a publication failure leaves `develop` untouched with no reopening PR."
  ],
  "archiveDigest": "d0e733cfc3dce56d7e704716fae6c2f18d5697af4bda1a1b5951083b9c7ed92b",
  "specDigest": "28867f25de74122db06c571cec3fc67fc4955251ddcb30b5b407ccc3de777ffa",
  "tasksDigest": "e8b214257e9cefbc8fdedc248f124519147a9039bb67dc418fa221af348c0249",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
