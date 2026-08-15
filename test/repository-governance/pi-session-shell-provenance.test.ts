import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Pi session shell provenance", () => {
  it("records the exact MIT upstream and every orchestration port", async () => {
    const evidence = JSON.parse(await readFile(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/pi-session-shell-provenance.json",
      "utf8",
    )) as {
      schema: string;
      upstream: { commit: string; license: string; packages: { name: string; version: string }[] };
      orchestrationPorts: { copiedFiles: string[]; copiedLines: boolean; localFile: string; coverage: string[] }[];
      rejected: string[];
    };

    expect(evidence.schema).toBe("addone-pi-session-shell-provenance-v1");
    expect(evidence.upstream.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(evidence.upstream.license).toBe("MIT");
    expect(evidence.upstream.packages).toEqual([
      { name: "@earendil-works/pi-coding-agent", version: "0.84.1" },
      { name: "@earendil-works/pi-tui", version: "0.84.1" },
    ]);
    expect(evidence.orchestrationPorts).toHaveLength(1);
    expect(evidence.orchestrationPorts[0]).toMatchObject({
      copiedFiles: [],
      copiedLines: false,
      localFile: "src/features/owned-ui/pi-session-shell.ts",
    });
    expect(evidence.orchestrationPorts[0]?.coverage.length).toBeGreaterThanOrEqual(3);
    expect(evidence.rejected).toContain("private field inspection");
  });
});
