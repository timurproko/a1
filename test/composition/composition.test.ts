import { describe, expect, it } from "vitest";
import { composeProcess } from "../../src/composition/index.js";
import { TestAgentEngine, TestPresentationRuntime, TestPresentationTerminal } from "../features/owned-ui/neutral-port-doubles.js";

const component = { render: (width: number) => [`width:${width}`], invalidate() {} };

describe("process composition root", () => {
  it("validates and wires neutral engine and presentation ports", async () => {
    const engine = new TestAgentEngine("composed-session");
    const terminal = new TestPresentationTerminal();
    const composition = await composeProcess({
      engine,
      presentationFactory: (root, selectedTerminal) => new TestPresentationRuntime(selectedTerminal as TestPresentationTerminal),
    });

    const session = await composition.engine.createSession({ sessionId: "composed-session", cwd: process.cwd() });
    expect(session.sessionId).toBe("composed-session");
    const presentation = composition.createPresentation(component, terminal);
    presentation.start();
    expect(presentation.state).toBe("running");
    await composition.dispose();
    await composition.dispose();
    expect(engine.disposed).toBe(true);
    expect(presentation.state).toBe("stopped");
  });

  it("rejects malformed engine and presentation implementations at construction boundaries", async () => {
    await expect(composeProcess({ engine: { capabilities: {}, createSession() {}, dispose() {} } as never })).rejects.toThrow(/contract version/);
    const composition = await composeProcess({ engine: new TestAgentEngine(), presentationFactory: () => ({ state: "idle" }) as never });
    expect(() => composition.createPresentation(component, new TestPresentationTerminal())).toThrow(/requires start/);
    await composition.dispose();
  });

  it("bounds and aggregates disposal failures after attempting every owned resource", async () => {
    const engine = new TestAgentEngine();
    engine.dispose = async () => { throw new Error("engine failed"); };
    const runtime = new TestPresentationRuntime();
    runtime.stop = async () => { throw new Error("presentation failed"); };
    const composition = await composeProcess({ engine, presentationFactory: () => runtime });
    composition.createPresentation(component, runtime.terminal);

    await expect(composition.dispose()).rejects.toThrow(/process composition disposal failed/);
  });
});
