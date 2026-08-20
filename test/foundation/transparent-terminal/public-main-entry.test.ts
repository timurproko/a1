import { describe, expect, it, vi } from "vitest";
import { runPublicMainEntry } from "../../../src/foundation/pi-engine-adapter/public-main-entry.js";

describe("selected Pi public main child entry", () => {
  it("passes child arguments unchanged to the documented package-root main export", async () => {
    const main = vi.fn(async () => {});
    await expect(runPublicMainEntry(["--model", "openai/gpt-5", "prompt"], { main })).resolves.toBe(0);
    expect(main).toHaveBeenCalledWith(["--model", "openai/gpt-5", "prompt"]);
  });

  it("reports a bounded single-line startup failure and exits unsuccessfully", async () => {
    const stderr = vi.fn();
    const detail = `broken\n${"x".repeat(500)}`;
    const result = await runPublicMainEntry([], { main: async () => { throw new Error(detail); }, stderr });
    expect(result).toBe(1);
    expect(stderr).toHaveBeenCalledOnce();
    const message = stderr.mock.calls[0]![0];
    expect(message).toMatch(/^Selected Pi startup failed: broken x+\.\.\.\n$/);
    expect(message.length).toBeLessThan(440);
    expect(message).not.toContain("at runPublicMainEntry");
  });
});
