import { writeFile } from "node:fs/promises";
import { buildEventFrameParityResult, SCRIPTED_PI_EVENTS } from "../test/features/owned-ui/pi-event-frame-parity-fixture.js";

const result = await buildEventFrameParityResult();
const output = {
  schema: "addone-pi-event-frame-parity-v1",
  generatedFrom: {
    repository: "https://github.com/earendil-works/pi.git",
    sourceCommit: "53fa77ccd8a279eb87e92294ef3687b03ff80112",
    packages: {
      "@earendil-works/pi-coding-agent": "0.84.1",
      "@earendil-works/pi-tui": "0.84.1"
    }
  },
  tolerance: {
    ignored: ["cursor visibility", "synchronized-output envelope", "render timing"],
    preserved: ["rendered row payloads", "cursor addressing", "state transitions", "resize dimensions"]
  },
  eventStages: ["initial", ...SCRIPTED_PI_EVENTS.map(entry => entry.stage), "resized"],
  ...result
};

await writeFile(
  "test/features/owned-ui/fixtures/pi-event-frame-parity.json",
  `${JSON.stringify(output, null, 2)}\n`,
);
