# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Both pinned Pi packages, command resources, provenance records, inventories, startup budget, and parity fixtures identify 0.99.2 at upstream commit `005af57d88ee23b33778f343a9595b32e67ff788`.
- A1's public SDK service/session path adopts deferred MCP connection and discovery, MCP authentication options, Anthropic federation, provisional provider availability, and the 0.99.2 reliability corrections without private imports.
- A1's owned `/reload` route delegates to the Pi session created by `createAgentSessionFromServices`, so newly configured default tools activate through Pi's new `usesDefaultTools` behavior.
- All six changed public exports are dispositioned: the SDK satisfies the AgentSession change, ModelRuntime's change is private, and the remaining four exports are not consumed by A1.
- The unchanged owned-presentation bodies retain their accepted behavior while regenerated truecolor event and component fixtures expose the 0.99.2 startup identity.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-0-99-2",
  "sourcePr": 652,
  "archive": "openspec/changes/archive/2026-10-01-pi-upgrade-0-99-2/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-01-pi-upgrade-0-99-2/acceptance.md",
  "finalizedDate": "2026-10-01",
  "specBaseSha": "e42eb4df77ceb0e49e502e55c3f1f904cb04b4b8",
  "acceptanceScenarios": [
    "Both pinned Pi packages, command resources, provenance records, inventories, startup budget, and parity fixtures identify 0.99.2 at upstream commit `005af57d88ee23b33778f343a9595b32e67ff788`.",
    "A1's public SDK service/session path adopts deferred MCP connection and discovery, MCP authentication options, Anthropic federation, provisional provider availability, and the 0.99.2 reliability corrections without private imports.",
    "A1's owned `/reload` route delegates to the Pi session created by `createAgentSessionFromServices`, so newly configured default tools activate through Pi's new `usesDefaultTools` behavior.",
    "All six changed public exports are dispositioned: the SDK satisfies the AgentSession change, ModelRuntime's change is private, and the remaining four exports are not consumed by A1.",
    "The unchanged owned-presentation bodies retain their accepted behavior while regenerated truecolor event and component fixtures expose the 0.99.2 startup identity."
  ],
  "archiveDigest": "bd8bbc7f18f0a658f91b4ef46064d6dad252652dc9317afd234bf4aefc5b2a5f",
  "specDigest": "c8045058b60fbb257a83921a29da4e096367b720fca94bc571828013cb4e5a9e",
  "tasksDigest": "8b4534f4d69e4186f899d236c4e749bacb38566801a9b4368542e506d4535119",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
