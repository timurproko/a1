import { access } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createScenarioContext } from "../../src/test-harness/context.js";
import { OuterPtyRunner } from "../../src/test-harness/pty-runner.js";

const enabled = process.env.ADDONE_NATIVE_PI_SMOKE === "1";
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe.skipIf(!enabled)("installed Native Pi readiness smoke", () => {
  it("reaches a recognizable editor with isolated offline configuration and sends no model request", async () => {
    const context = await createScenarioContext("native-pi-smoke");
    context.environment.PATH = process.env.PATH?.split(delimiter).filter(path => path !== context.fixtureBin).join(delimiter);
    if (process.env.ADDONE_NATIVE_PI_EXECUTABLE) context.environment.ADDONE_NATIVE_PI_EXECUTABLE = process.env.ADDONE_NATIVE_PI_EXECUTABLE;
    context.environment.ADDONE_NATIVE_PI_ARGUMENTS = JSON.stringify(["--offline", "--approve", "--no-session"]);
    delete context.environment.NO_COLOR;
    await access(resolve(repository, "bin/addone.js"));
    const runner = new OuterPtyRunner(context, 90, 28);
    try {
      runner.launch(process.execPath, [resolve(repository, "bin/addone.js")]);
      const frame = await runner.waitFor("escape interrupt", 25_000, "installed-pi-ready");
      const text = frame.lines.join("\n");
      expect(text).toMatch(/pi v\d/i);
      expect(text).toMatch(/0\.0%|tokens?|model/i);
      expect(text).not.toContain("[ + ]");
      expect(runner.rawLog).not.toContain("Native Pi 1");
    } finally {
      await runner.cleanup();
    }
  }, 35_000);
});
