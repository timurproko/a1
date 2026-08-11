import { describe, expect, it } from "vitest";
import { nativePiArguments } from "../../src/supervisor/server.js";

describe("vanilla Native Pi arguments", () => {
  it("does not force Pi into an alternate fullscreen interaction mode", () => {
    expect(nativePiArguments(undefined)).toEqual([]);
  });

  it("preserves explicitly configured safe arguments", () => {
    expect(nativePiArguments(JSON.stringify(["--offline", "--approve", "--no-session"]))).toEqual(["--offline", "--approve", "--no-session"]);
  });
});
