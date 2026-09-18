import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ENGINE_ROOT = "src/integrations/pi/engine";

describe("Pi engine adapter type boundary", () => {
  it("uses official runtime/session/service types without permissive Like mirrors", async () => {
    const runtime = await readFile(join(ENGINE_ROOT, "session-runtime.ts"), "utf8");
    expect(runtime).toContain("type AgentSessionRuntime");
    expect(runtime).toContain("type AgentSessionServices");
    for (const name of (await readdir(ENGINE_ROOT)).filter(entry => entry.endsWith(".ts"))) {
      const source = await readFile(join(ENGINE_ROOT, name), "utf8");
      expect(source, name).not.toMatch(/\b(?:interface|type)\s+Pi[A-Za-z0-9_$]*Like\b|\bPi[A-Za-z0-9_$]*Like\b/);
      expect(source, name).not.toMatch(/\b(?:dynamicCall|requiredDynamicCall|dynamicCallAsync|requiredDynamicCallAsync)\b|target\s*\[\s*method\s*\]/);
    }
  });
});
