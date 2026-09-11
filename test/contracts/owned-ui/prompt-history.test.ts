import { describe, expect, it } from "vitest";
import { assertPromptHistorySubmission } from "../../../src/contracts/owned-ui/index.js";

describe("typed prompt history input", () => {
  const valid = { id: "test-id", text: "synthetic prompt", timestamp: 1, kind: "prompt" };
  it.each(["prompt", "steer", "follow-up", "bash", "slash"])("accepts the classified %s route", kind => {
    expect(() => assertPromptHistorySubmission({ ...valid, kind })).not.toThrow();
  });
  it.each([
    { token: "private sentinel" }, { kind: "assistant" }, { text: " " }, { id: "bad id" },
    { text: " not canonical " }, { timestamp: -1 }, { timestamp: Number.NaN }, { cwd: {} }, { images: [] },
  ])("rejects malformed or unclassified input without its contents", patch => {
    expect(() => assertPromptHistorySubmission({ ...valid, ...patch })).toThrow("Invalid history submission");
  });
});
