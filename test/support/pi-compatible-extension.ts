export function compatibleExtensionSource(paths: { audit: string; gate: string; operational: string }): string {
  const metadataCommand = `node -e 'console.log(JSON.stringify(Object.fromEntries(["PI_SESSION_ID","PI_SESSION_FILE","PI_PROVIDER","PI_MODEL","PI_REASONING_LEVEL"].map(k => [k,process.env[k]]))))'`;
  return `
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { Text } from "@earendil-works/pi-tui";
import { createAgentSession, DefaultResourceLoader, getAgentDir, ModelRuntime, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
const fixture = ${JSON.stringify(paths)};
const note = (event, data = {}) => appendFileSync(fixture.audit, JSON.stringify({ event, ...data }) + "\\n");
export default function(pi) {
  let child, ctx, digestPending = true, followUp = false;
  pi.on("session_start", async (event, context) => {
    ctx = context;
    note("starting", { reason: event.reason, session: ctx.sessionManager.getSessionId() });
    while (!existsSync(fixture.gate)) await new Promise(resolve => setTimeout(resolve, 5));
    const agentDir = getAgentDir();
    const settingsManager = SettingsManager.create(ctx.cwd, agentDir, { projectTrusted: false });
    const loader = new DefaultResourceLoader({ cwd: ctx.cwd, agentDir, settingsManager, noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true });
    await loader.reload();
    const modelRuntime = await ModelRuntime.create({ authPath: agentDir + "/auth.json", modelsPath: agentDir + "/models.json", refreshOnCreate: false });
    await modelRuntime.refresh({ allowNetwork: false });
    child = (await createAgentSession({ cwd: ctx.cwd, agentDir, settingsManager, modelRuntime, resourceLoader: loader, sessionManager: SessionManager.inMemory(ctx.cwd), tools: [] })).session;
    note("ready", { reason: event.reason, session: ctx.sessionManager.getSessionId(), child: child.sessionId, provider: child.model?.provider, model: child.model?.id, agentDir, mode: ctx.mode, hasUI: ctx.hasUI });
    const pending = fixture.audit + ".pending";
    if (existsSync(pending)) {
      const content = readFileSync(pending, "utf8");
      pi.sendMessage({ customType: "compat-pending", content, display: true });
      rmSync(pending); note("pending-delivered", { content });
    }
    ctx.ui.setStatus("compat", "supervision-ready");
    ctx.ui.setWidget("compat", ["compatibility-widget:" + ctx.sessionManager.getSessionId()]);
    ctx.ui.notify("compatibility-notice", "warning");
    ctx.ui.setEditorText("compatibility-editor");
  });
  pi.on("session_shutdown", event => { child?.dispose(); child = undefined; note("shutdown", { reason: event.reason }); });
  pi.on("input", event => event.text === "steering-answer" ? { action: "transform", text: "ack: steering-answer" } : { action: "continue" });
  pi.on("before_agent_start", event => {
    note("before", { ready: !!child });
    if (event.prompt === "queue-followup") followUp = true;
    if (!digestPending) return;
    digestPending = false;
    return { message: { customType: "compat-digest", content: "startup-digest-once", display: true } };
  });
  pi.on("agent_start", () => note("agent_start"));
  pi.on("turn_end", () => note("turn_end"));
  pi.on("agent_end", async () => {
    note("agent_end");
    if (followUp) { followUp = false; await pi.sendUserMessage("durable-followup", { deliverAs: "followUp" }); }
  });
  pi.on("agent_settled", () => note("agent_settled"));
  pi.on("message_start", event => { if (event.message.role === "user") note("user", { text: event.message.content }); });
  pi.events.on("compat:notification", () => { note("notification"); ctx?.ui.notify("completion-notification", "info"); });
  pi.registerCommand("compat-pending", { handler: async args => writeFileSync(fixture.audit + ".pending", args) });
  pi.registerCommand("compat-ask", { handler: async (_args, ctx) => note("answer", { text: await ctx.ui.input("compatibility-question") }) });
  pi.registerTool({ name: "compat_metadata", label: "Metadata", description: "Read session-aware shell metadata", parameters: { type: "object", properties: {} },
    async execute(_id, _args, _signal, _update, ctx) {
      const result = await ctx.executeTool("bash", { command: ${JSON.stringify(metadataCommand)} });
      if (result.isError) throw new Error("metadata shell failed");
      const text = result.result.content.filter(item => item.type === "text").map(item => item.text).join("\\n");
      note("metadata", JSON.parse(text));
      return { content: [{ type: "text", text: "metadata captured" }], details: {} };
    }
  });
  pi.registerTool({
    name: "compat_watch", label: "Compat watch", description: "Exercise supervision tool and helper cwd", parameters: { type: "object", properties: {} },
    async execute(_id, _args, _signal, _update, ctx) {
      const helper = await pi.exec(process.execPath, ["-e", "process.stdout.write(process.cwd())"], { cwd: fixture.operational, timeout: 10000 });
      if (helper.code !== 0) throw new Error("helper failed");
      note("helper", { cwd: helper.stdout });
      const result = await ctx.executeTool("write", { path: "owned-tool.txt", content: "attached-only:" + ctx.sessionManager.getSessionId() });
      if (result.isError) throw new Error("nested attached write failed");
      pi.events.emit("compat:notification", {});
      return { content: [{ type: "text", text: "watch-result" }], details: {} };
    },
    renderCall: () => new Text("compatibility-watch-call", 0, 0),
    renderResult: () => new Text("compatibility-watch-result", 0, 0),
  });
}
`;
}
