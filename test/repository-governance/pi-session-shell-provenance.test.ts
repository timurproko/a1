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
      publicExports: string[];
      orchestrationPorts: { copiedFiles: string[]; copiedLines: boolean; localFile: string; upstreamCommit: string; upstreamLines: unknown; coverage: string[] }[];
      rejected: string[];
    };

    expect(evidence.schema).toBe("addone-pi-session-shell-provenance-v1");
    expect(evidence.upstream.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(evidence.upstream.license).toBe("MIT");
    expect(evidence.upstream.packages).toEqual([
      { name: "@earendil-works/pi-coding-agent", version: "0.84.2" },
      { name: "@earendil-works/pi-tui", version: "0.84.2" },
    ]);
    expect(evidence.publicExports).toContain("FooterComponent");
    expect(evidence.publicExports).toContain("CombinedAutocompleteProvider");
    expect(new Set(evidence.publicExports).size).toBe(evidence.publicExports.length);
    expect(evidence.orchestrationPorts).toHaveLength(4);
    expect(evidence.orchestrationPorts.every(port => port.copiedFiles.length === 0 && port.copiedLines === false)).toBe(true);
    expect(evidence.orchestrationPorts.every(port => port.upstreamCommit === evidence.upstream.commit)).toBe(true);
    expect(evidence.orchestrationPorts[0]).toMatchObject({
      copiedFiles: [],
      copiedLines: false,
      localFile: "src/features/owned-ui/pi-session-shell.ts",
      upstreamCommit: "914cf1472e715297caa30db4b9535d534a9eb718",
      upstreamLines: [528, 994],
    });
    expect(evidence.orchestrationPorts[0]?.coverage).toContain("test/features/owned-ui/pi-startup-composition-parity.test.ts");
    expect(evidence.orchestrationPorts[2]).toMatchObject({
      localFile: "src/foundation/pi-engine-adapter/adapter.ts",
      upstreamCommit: "914cf1472e715297caa30db4b9535d534a9eb718",
      copiedFiles: [],
      copiedLines: false,
    });
    expect(evidence.orchestrationPorts[2]?.coverage).toContain("test/foundation/pi-engine-adapter/workflows.test.ts");
    expect(evidence.rejected).toContain("private field inspection");
  });
});
