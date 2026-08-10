import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SupervisorClient } from "../../src/protocol/client.js";
import { resolveAddOnePaths } from "../../src/supervisor/paths.js";
import { preserveFailure } from "../../src/test-harness/artifacts.js";
import { createScenarioContext } from "../../src/test-harness/context.js";
import { OuterPtyRunner } from "../../src/test-harness/pty-runner.js";
import { WALKING_SKELETON_SCENARIO } from "../../src/test-harness/scenario.js";
import type { OrderedEvent } from "../../src/domain/index.js";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const cli = resolve(repository, "bin/addone.js");

describe("release-gating Native Pi walking skeleton", () => {
  it("exercises the real CLI, supervisor, nested fixture PTY, and UI reconnection", async () => {
    const context = await createScenarioContext(WALKING_SKELETON_SCENARIO.id);
    const assertions: { name: string; passed: boolean; detail?: string }[] = [];
    const events: OrderedEvent[] = [];
    const runners: OuterPtyRunner[] = [];
    let observer: SupervisorClient | null = null;
    try {
      const first = new OuterPtyRunner(context, 90, 28);
      runners.push(first);
      first.launch(process.execPath, [cli]);
      const shell = await first.waitFor("AddOne", 8_000, "shell-after-intro");
      expect(shell.lines.join("\n")).toContain("[ + ]");
      assertions.push({ name: "completed intro reveals always-reachable +", passed: true });

      observer = new SupervisorClient();
      await observer.connect(resolveAddOnePaths(context.environment).endpoint);
      observer.on("event", event => events.push(event));

      first.keyboard("\r");
      const nested = await first.waitFor("PI FIXTURE", 8_000, "keyboard-created");
      expect(nested.lines.join("\n")).toContain("Native Pi 1");
      assertions.push({ name: "keyboard + creates selected nested fixture", passed: true });

      first.keyboard("hello fixture\r");
      await first.waitFor("INPUT", 5_000, "input-echo");
      assertions.push({ name: "unclaimed input reaches child", passed: true });

      first.resize(72, 22);
      await first.waitFor("RESIZED:72x18", 5_000, "child-resized");
      assertions.push({ name: "outer resize reaches bounded child surface", passed: true });

      await first.stopUi();
      const second = new OuterPtyRunner(context, 72, 22);
      runners.push(second);
      second.launch(process.execPath, [cli]);
      const restored = await second.waitFor("PI FIXTURE", 8_000, "resident-after-ui-restart");
      expect(restored.lines.join("\n")).toContain("Native Pi 1");
      assertions.push({ name: "UI restart restores resident surface without child restart", passed: true });

      second.keyboard("exit 7\r");
      await second.waitFor("FINAL SURFACE", 5_000, "child-final-output");
      const final = await second.waitFor("exited (7)", 5_000, "retained-final-surface");
      expect(final.lines.join("\n")).toContain("FINAL SURFACE");
      assertions.push({ name: "child exit retains final surface and shell", passed: true });

      second.keyboard("\t");
      second.mouse(4, 1);
      const mouse = await second.waitFor("Native Pi 2", 8_000, "mouse-created");
      expect(mouse.lines.join("\n")).toContain("PI FIXTURE");
      assertions.push({ name: "mouse + is consumed once and shell continues", passed: true });

      let childLog = "";
      const logDeadline = Date.now() + 3_000;
      while (Date.now() < logDeadline) {
        childLog = await readFile(context.childLog, "utf8");
        if ((childLog.match(/paint size=/g) ?? []).length === 2) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      expect((childLog.match(/paint size=/g) ?? []).length).toBe(2);
      assertions.push({ name: "UI restart retained first child; only two explicit agents launched", passed: true });
    } catch (error) {
      await preserveFailure(context, {
        scenario: WALKING_SKELETON_SCENARIO,
        frames: runners.flatMap(runner => runner.frames),
        timeline: runners.flatMap(runner => runner.timeline),
        supervisorEvents: events,
        assertions,
        outerLog: runners.map(runner => runner.rawLog).join("\n--- UI RESTART ---\n"),
      }, error);
      throw new Error(`${error instanceof Error ? error.message : String(error)}\nArtifacts: ${context.artifacts}`, { cause: error });
    } finally {
      observer?.close();
      await runners.at(-1)?.cleanup();
    }
  }, 30_000);
});
