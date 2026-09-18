import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

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
      "Never persist in A1's control store",
      "Unknown or untyped values are potentially sensitive by default",
      "failed in-terminal 2×2 proof cannot be waived",
      "active workstation",
    ];
    for (const term of requiredTerms) expect(policy).toContain(term);
    expect(policy).not.toContain("unbounded");
  });

  it("prohibits accidental terminal or credential persistence through the control store", async () => {
    const storage = await readFile("src/foundation/storage/control-store.ts", "utf8");
    expect(storage).not.toMatch(/terminalBytes|ptyBytes|renderedCells|cellGrid|screenBuffer|accessToken|apiKey|password/i);
  });
});
