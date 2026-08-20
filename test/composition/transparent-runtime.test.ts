import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { selectTransparentChild } from "../../src/composition/transparent-runtime.js";

describe("transparent child composition", () => {
  it("selects the exact runtime executable and owned public-entry module before generic launch", () => {
    const compositionUrl = new URL("../../dist/src/composition/transparent-runtime.js", import.meta.url).href;
    const selected = selectTransparentChild({ A1_LAUNCH_ARGUMENTS_JSON: '["--no-approve"]' }, "D:/node/node.exe", compositionUrl);
    expect(selected.executable).toBe("D:/node/node.exe");
    expect(selected.arguments).toEqual([
      fileURLToPath(new URL("../foundation/pi-engine-adapter/public-main-entry.js", compositionUrl)),
      "--no-approve",
    ]);
  });

  it("rejects malformed selected arguments before constructing a launch profile", () => {
    expect(() => selectTransparentChild({ A1_LAUNCH_ARGUMENTS_JSON: "{}" })).toThrow(/JSON array of strings/);
  });
});
