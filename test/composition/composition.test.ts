import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { composeProcess, composeStructuredWorkspace, composeStructuredWorkspaceApplication } from "../../src/composition/index.js";
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

  it("creates independent structured workspace engines through neutral composition wiring", async () => {
    const engines = new Map<string, TestAgentEngine>();
    const workspace = composeStructuredWorkspace({
      createEngine: async agentId => {
        const engine = new TestAgentEngine(`${agentId}.session`);
        engines.set(agentId, engine);
        return engine;
      },
    });

    await workspace.createAgent({ id: "agent-1", displayName: "Research" });
    await workspace.createAgent({ id: "agent-2", displayName: "Review" });
    await workspace.selectAgent("agent-2");
    await workspace.sendPrompt("agent-2", "review this");

    expect(workspace.view()).toMatchObject({ role: "tablist", workspace: { selectedAgentId: "agent-2" } });
    expect(engines.get("agent-1")?.session.commands).toEqual([]);
    expect(engines.get("agent-2")?.session.commands).toMatchObject([{ type: "prompt", text: "review this" }]);
    await workspace.dispose();
  });

  it("runs the bare owned UI as a structured tab workspace in regular and fullscreen modes", async () => {
    for (const mode of ["regular", "fullscreen"] as const) {
      const terminal = new TestPresentationTerminal();
      const engines = new Map<string, TestAgentEngine[]>();
      const application = await composeStructuredWorkspaceApplication({
        mode,
        terminal,
        createEngine: async agentId => {
          const engine = new TestAgentEngine(`${agentId}.session`);
          const entries = engines.get(agentId) ?? [];
          entries.push(engine);
          engines.set(agentId, entries);
          return engine;
        },
      });

      application.start();
      await application.submit("/agent new Review");
      expect(application.workspace.view()).toMatchObject({
        role: "tablist",
        workspace: { selectedAgentId: "agent-2" },
        tabs: [{ label: "Agent 1" }, { label: "Review", selected: true }],
      });
      application.root.editor.setText("review draft");
      await application.switchRelative(-1);
      expect(application.workspace.view().panels.find(panel => panel.agentId === "agent-2")?.editorText).toBe("review draft");
      await application.submit("prompt first agent");
      expect(engines.get("agent-1")?.[0]?.session.commands).toMatchObject([{ type: "prompt", text: "prompt first agent" }]);
      expect(engines.get("agent-2")?.[0]?.session.commands).toEqual([]);
      expect(application.component.render(80)[0]).toContain("[Agent 1]");

      await application.submit("/agent stop");
      expect(application.workspace.view().selectedPanel?.lifecycle).toBe("stopped");
      await application.submit("/agent restart");
      expect(engines.get("agent-1")).toHaveLength(2);
      expect(application.workspace.view().selectedPanel?.lifecycle).toBe("ready");
      await application.dispose();
      expect(terminal.active).toBe(false);
    }
  });

  it("cuts the bare executable over without changing explicit transparent routing", async () => {
    const source = await readFile("bin/a1-ui.js", "utf8");
    expect(source).toContain("composeStructuredWorkspaceApplication");
    expect(source).not.toContain("composeOwnedUiApplication");
    expect(source).toContain("runSelectedTransparentRuntime(profileId)");
    expect(source).not.toMatch(/terminal-host|native-host/);
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
