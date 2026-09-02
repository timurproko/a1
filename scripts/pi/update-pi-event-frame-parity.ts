import { writeFile } from "node:fs/promises";
import identity from "../../src/product-identity.json" with { type: "json" };
import {
  buildEventFrameParityResult,
  EVENT_FRAME_PARITY_COLOR_MODE,
  SCRIPTED_PI_EVENTS,
} from "../../test/features/owned-ui/pi-event-frame-parity-fixture.js";

const result = await buildEventFrameParityResult();
const output = {
  schema: identity.evidence.piEventFrameParitySchema,
  generatedFrom: {
    producer: "a1-diagnostic",
    evidenceAuthority: false,
    colorMode: EVENT_FRAME_PARITY_COLOR_MODE,
    repository: "https://github.com/earendil-works/pi.git",
    sourceCommit: "914cf1472e715297caa30db4b9535d534a9eb718",
    packages: {
      "@earendil-works/pi-coding-agent": "0.84.2",
      "@earendil-works/pi-tui": "0.84.2"
    }
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
