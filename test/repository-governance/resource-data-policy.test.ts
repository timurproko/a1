import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { WORKSPACE_CONTRACT_VERSION, type StructuredCapabilityContract } from "../../src/foundation/workspace-contracts/index.js";

describe("multi-agent resource and data classification policy", () => {
  it("defines mandatory bounded resources, outcomes, and data classes", async () => {
    const policy = await readFile("docs/architecture/resource-and-data-policy.md", "utf8");
    const requiredTerms = [
      "Structured event payload",
      "Structured snapshot payload",
      "Structured attachment payload",
      "Queued structured events per agent",
      "Concurrent structured commands per agent",
      "Reconnect replay per adapter",
      "Native-host control message",
      "Native topology nodes per tab",
      "Terminal sessions per host",
      "Terminal launch arguments",
      "Terminal environment entries",
      "Retained terminal model per pane",
      "Scrollback per pane",
      "Proof evidence file",
      "Diagnostic payload",
      "Backpressure must isolate",
      "Workspace metadata",
      "Structured payloads",
      "Terminal content",
      "Host topology metadata",
      "Native proof evidence",
      "Environment values",
      "Credentials and tokens",
      "Authentication state",
      "Logs and diagnostics",
      "Never persist in AddOne's control store",
      "Unknown or untyped values are potentially sensitive by default",
      "failed 2×2 native-host proof cannot be waived",
      "active workstation",
    ];
    for (const term of requiredTerms) expect(policy).toContain(term);
    expect(policy).not.toContain("unbounded");
  });

  it("keeps default structured contract limits explicit and positive", () => {
    const flow: StructuredCapabilityContract["flow"] = {
      maxEventBytes: 64 * 1024,
      maxSnapshotBytes: 1024 * 1024,
      maxAttachmentBytes: 2 * 1024 * 1024,
      maxQueuedEvents: 256,
      maxConcurrentCommands: 4,
      maxReconnectEvents: 1024,
    };
    expect(Object.values(flow)).toEqual([64 * 1024, 1024 * 1024, 2 * 1024 * 1024, 256, 4, 1024]);
    expect(WORKSPACE_CONTRACT_VERSION).toBe(1);
  });

  it("prohibits accidental terminal or credential persistence through current contracts", async () => {
    const contracts = await readFile("src/foundation/workspace-contracts/model.ts", "utf8");
    const storage = await readFile("src/foundation/storage/control-store.ts", "utf8");
    expect(contracts).not.toMatch(/terminalBytes|ptyBytes|renderedCells|cellGrid|screenBuffer|accessToken|apiKey|password/i);
    expect(storage).not.toMatch(/terminalBytes|ptyBytes|renderedCells|cellGrid|screenBuffer|accessToken|apiKey|password/i);
  });
});
