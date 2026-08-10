import { access } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { createScenarioContext } from "../../src/test-harness/context.js";
import { OuterPtyRunner } from "../../src/test-harness/pty-runner.js";

const enabled = process.env.ADDONE_NATIVE_PI_SMOKE === "1";
const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe.skipIf(!enabled)("non-gating installed Native Pi smoke", () => {
  it("starts installed Native Pi with isolated offline configuration and sends no model request", async () => {
    const context = await createScenarioContext("native-pi-smoke");
    context.environment.PATH = process.env.PATH?.split(delimiter).filter(path => path !== context.fixtureBin).join(delimiter);
    context.environment.NO_COLOR = "1";
    await access(resolve(repository, "bin/addone.js"));
    const runner = new OuterPtyRunner(context, 90, 28);
    try {
      runner.launch(process.execPath, [resolve(repository, "bin/addone.js")]);
      await runner.waitFor("AddOne", 8_000, "smoke-shell");
      runner.keyboard("\r");
      await runner.waitFor("Native Pi 1", 8_000, "installed-pi-started");
    } finally {
      await runner.cleanup();
    }
  }, 30_000);
});
