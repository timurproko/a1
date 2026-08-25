import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Pi engine adapter type boundary", () => {
  it("uses official runtime/session/service types without permissive Like mirrors", async () => {
    const source = await readFile("src/integrations/pi/engine/adapter.ts", "utf8");
    expect(source).toContain("type AgentSessionRuntime");
    expect(source).toContain("type AgentSessionServices");
    expect(source).not.toMatch(/\b(?:interface|type)\s+Pi[A-Za-z0-9_$]*Like\b|\bPi[A-Za-z0-9_$]*Like\b/);
    expect(source).not.toMatch(/\b(?:dynamicCall|requiredDynamicCall|dynamicCallAsync|requiredDynamicCallAsync)\b|target\s*\[\s*method\s*\]/);
  });
});
