import { describe, expect, it } from "vitest";
import {
  PI_BUILTIN_WORKFLOW_ROUTES,
  PI_WORKFLOW_CAPABILITIES,
  PiWorkflowControllerPort,
} from "../../../src/foundation/pi-engine-adapter/index.js";

describe("capability-specific workflow controllers", () => {
  it("declares and routes every visible and hidden built-in workflow", async () => {
    const routed: string[] = [];
    const port = new PiWorkflowControllerPort(PI_WORKFLOW_CAPABILITIES, async workflowId => {
      routed.push(workflowId);
      return { outcome: "completed", message: `${workflowId} complete` };
    });
    expect((await port.listWorkflows()).map(value => value.id)).toEqual(PI_BUILTIN_WORKFLOW_ROUTES);
    for (const route of PI_BUILTIN_WORKFLOW_ROUTES) {
      await expect(port.executeWorkflow(route, {})).resolves.toMatchObject({ outcome: "completed" });
    }
    expect(routed).toEqual(PI_BUILTIN_WORKFLOW_ROUTES);
  });

  it("fails before execution when each required capability is removed", async () => {
    const descriptors = await new PiWorkflowControllerPort(PI_WORKFLOW_CAPABILITIES, async () => ({ outcome: "completed", message: "unexpected" })).listWorkflows();
    for (const descriptor of descriptors) {
      for (const required of descriptor.requiredCommands) {
        let executed = false;
        const available = PI_WORKFLOW_CAPABILITIES.filter(capability => capability !== required);
        const port = new PiWorkflowControllerPort(available, async () => { executed = true; return { outcome: "completed", message: "unexpected" }; });
        await expect(port.executeWorkflow(descriptor.id, {})).resolves.toMatchObject({ outcome: "failed", message: expect.stringContaining(required) });
        expect(executed).toBe(false);
      }
    }
  });

  it("bounds thrown diagnostics and honors cancellation", async () => {
    const port = new PiWorkflowControllerPort(PI_WORKFLOW_CAPABILITIES, async () => { throw new Error("x".repeat(1000)); });
    const failure = await port.executeWorkflow("settings", {}) as { message: string };
    expect(failure.message.length).toBeLessThanOrEqual(512);
    const controller = new AbortController(); controller.abort();
    await expect(port.executeWorkflow("settings", {}, controller.signal)).resolves.toEqual({ outcome: "cancelled", message: "workflow cancelled" });
  });

  it("rejects unknown routes without invoking workflow behavior", async () => {
    let executed = false;
    const port = new PiWorkflowControllerPort(PI_WORKFLOW_CAPABILITIES, async () => { executed = true; return { outcome: "completed", message: "unexpected" }; });
    await expect(port.executeWorkflow("future", {})).resolves.toMatchObject({ outcome: "failed", message: expect.stringContaining("unavailable") });
    expect(executed).toBe(false);
  });
});
