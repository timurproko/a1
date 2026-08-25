import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Pi maintenance workflow separation", () => {
  it("keeps mandatory engine conformance independent from optional UI synchronization", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as { scripts: Record<string, string> };
    const engine = manifest.scripts["test:pi-engine-conformance"];
    const synchronization = manifest.scripts["sync:pi-ui"];
    expect(engine).toContain("test/integrations/pi/engine");
    expect(engine).not.toMatch(/update:pi|parity|source-ledger/);
    expect(synchronization).toContain("update:pi-component-parity");
    expect(synchronization).toContain("update:pi-event-frame-parity");
    for (const gate of ["check", "prepack", "prepublishOnly", "test:release"]) {
      expect(manifest.scripts[gate] ?? "", gate).not.toContain("sync:pi-ui");
    }
  });

  it("documents candidate and presentation maintenance as distinct workflows", async () => {
    const documentation = await readFile("docs/architecture/toolchain.md", "utf8");
    expect(documentation).toContain("npm run test:pi-engine-conformance");
    expect(documentation).toContain("npm run sync:pi-ui");
    expect(documentation).toContain("never an engine candidate acceptance gate");
    expect(documentation).toContain("--engine-only");
  });
});
