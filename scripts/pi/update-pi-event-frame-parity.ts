import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
// @ts-expect-error — plain shipped JS module without type declarations.
import { installPinnedPiTuiResolver } from "../../bin/module-resolver.js";
import { readPinnedPiIdentity } from "../governance/pinned-pi-identity.mjs";
import identity from "../../src/product-identity.json" with { type: "json" };

// Invariant: the resolver hook must be live before any Pi module links, exactly as the bin entries and the
// Vitest setup do, so the pinned components and A1's renderer share one pi-tui identity. The fixture module
// is therefore imported after the hook.
installPinnedPiTuiResolver(resolve("."));
const { buildEventFrameParityResult, EVENT_FRAME_PARITY_COLOR_MODE, SCRIPTED_PI_EVENTS } = await import("../../test/features/owned-ui/pi-event-frame-parity-fixture.js");
const pinned = await readPinnedPiIdentity(".");

const result = await buildEventFrameParityResult();
const output = {
  schema: identity.evidence.piEventFrameParitySchema,
  generatedFrom: {
    producer: "a1-diagnostic",
    evidenceAuthority: false,
    colorMode: EVENT_FRAME_PARITY_COLOR_MODE,
    repository: "https://github.com/earendil-works/pi.git",
    sourceCommit: pinned.commit,
    packages: Object.fromEntries(pinned.packages.map(entry => [entry.name, entry.version])),
  },
  tolerance: {
    ignored: ["synchronized-output envelope", "render timing", "file hyperlink availability and absolute targets", "declared product and path substitutions"],
    preserved: ["semantic ANSI", "reset boundaries", "rendered row payloads", "cursor visibility", "cursor addressing", "clearing and restoration order", "state transitions", "resize dimensions"]
  },
  eventStages: ["initial", ...SCRIPTED_PI_EVENTS.map(entry => entry.stage), "resized"],
  ...result
};

await writeFile(
  "test/features/owned-ui/fixtures/pi-event-frame-parity.json",
  `${JSON.stringify(output, null, 2)}\n`,
);
