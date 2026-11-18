import { describe, expect, it } from "vitest";
import { carriesDeliveryMetadata, createRepositoryReader, readDeliveryRecord } from "../../scripts/release/delivery-record.mjs";

const block = (value: unknown, label = "openspec-implementation") => `## Automation\n\n\`\`\`${label}\n${typeof value === "string" ? value : JSON.stringify(value)}\n\`\`\`\n`;
const archive = "openspec/changes/archive/2026-11-18-example-change/";

describe("delivery record", () => {
  it("reads an unlinked, linked and finalized body", () => {
    const head = "a".repeat(40);
    expect(readDeliveryRecord("## Proposal\n\nNothing linked.")).toBeNull();
    expect(readDeliveryRecord(block({ version: 3, change: "example-change" }))).toEqual({ change: "example-change" });
    expect(readDeliveryRecord(block({ version: 3, change: "example-change", archive, acceptanceManifest: `${archive}acceptance.md`, finalizedHead: head })))
      .toEqual({ change: "example-change", archive, finalizedHead: head });
  });

  it("refuses a malformed, repeated, retired or unclosed record", () => {
    const code = (body: string) => { try { readDeliveryRecord(body); return "accepted"; } catch (error) { return (error as { recordCode?: string }).recordCode; } };
    expect(code(block("{"))).toBe("delivery-record-json");
    expect(code(block([1]))).toBe("delivery-record-shape");
    expect(code(block({ version: 2, change: "example-change" }))).toBe("delivery-record-identity");
    expect(code(block({ version: 3, change: "example-change", unexpected: true }))).toBe("delivery-record-fields");
    expect(code(block({ version: 3, change: "Not A Change" }))).toBe("delivery-record-identity");
    expect(code(block({ version: 3, change: "example-change", finalizedHead: "a".repeat(40) }))).toBe("delivery-record-finalization");
    expect(code(block({ version: 3, change: "example-change", archive, finalizedHead: "short" }))).toBe("delivery-record-finalization");
    expect(code(block({ version: 3, change: "a" }) + block({ version: 3, change: "b" }))).toBe("delivery-record-duplicate");
    expect(code("```openspec-implementation\n{")).toBe("delivery-record-unclosed");
  });

  it("recognizes any block the delivery automation owns", () => {
    expect(carriesDeliveryMetadata(block({}, "openspec-acceptance-request"))).toBe(true);
    expect(carriesDeliveryMetadata("```json\n{}\n```\nordinary")).toBe(false);
  });

  it("reads pages only inside its repository", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => {
      seen.push(url);
      return { ok: true, status: 200, text: async () => JSON.stringify(url.endsWith("&page=1") ? Array.from({ length: 100 }, (_, index) => index) : [100]) };
    }) as unknown as typeof fetch;
    const reader = createRepositoryReader({ repository: "owner/repo", fetchImpl });
    expect(await reader.pages("/pulls/7/files")).toHaveLength(101);
    expect(seen).toEqual(["https://api.github.com/repos/owner/repo/pulls/7/files?per_page=100&page=1", "https://api.github.com/repos/owner/repo/pulls/7/files?per_page=100&page=2"]);
    await expect(reader.get("/repos/other/repo/pulls/7")).rejects.toMatchObject({ recordCode: "api-scope" });
    expect(() => createRepositoryReader({ repository: "not a repository" })).toThrow("repository-identity");
  });
});
