import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const [producer, home, mode, encodedCases] = process.argv.slice(2);
if (!["pinned", "owned"].includes(producer) || !home || !["truecolor", "256color"].includes(mode) || !encodedCases) {
  throw new Error("Invalid command-message producer arguments");
}
const repository = resolve(import.meta.dirname, "../../../..");
const agentDir = join(home, "agent");
process.env.PI_CODING_AGENT_DIR = agentDir;
process.chdir(home);
const cases = JSON.parse(encodedCases);
const { Container, Text, setCapabilities, getCapabilities } = await import(pathToFileURL(join(repository, "bin/pi-tui.js")).href);
setCapabilities({ ...getCapabilities(), trueColor: mode === "truecolor", hyperlinks: false });
const { commandMessageView } = await import("./command-message-fixture.ts");

// Provenance: the pinned producer invokes unchanged published command methods on a synthetic
// owner. It never constructs InteractiveMode, patches its prototype, or imports an A1 presenter.
const pinned = producer === "pinned" ? await import("@earendil-works/pi-coding-agent") : undefined;
const pinnedTheme = producer === "pinned"
  ? await import(pathToFileURL(join(repository, "node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js")).href)
  : undefined;
const owned = producer === "owned"
  ? await import(pathToFileURL(join(repository, "src/integrations/pi/session-ui/session-shell-root.ts")).href)
  : undefined;
const ownedTheme = producer === "owned"
  ? await import(pathToFileURL(join(repository, "src/integrations/pi/components/theme.ts")).href)
  : undefined;
const results = [];
for (const theme of ["dark", "light"]) {
  if (pinned) pinned.initTheme(theme, false);
  else ownedTheme.applyPiTheme(theme, false, mode);
  for (const padding of [0, 1]) {
    for (const entry of cases) {
      let name;
      let normalizedName;
      let view = commandMessageView();
      const chatContainer = new Container();
      const runtime = { newSession: async () => ({ cancelled: false }) };
      const owner = {
        chatContainer, outputPad: padding, runtimeHost: runtime,
        sessionManager: { getSessionName: () => name },
        session: { messages: [], setSessionName: value => { name = normalizedName ?? value; } },
        ui: { terminal: { columns: 80, rows: 24 }, requestRender() {}, render: () => [] },
        clearStatusIndicator() {},
      };
      if (pinned) {
        for (const method of ["showStatus", "showError", "showWarning", "handleClearCommand", "handleNameCommand", "handleDebugCommand"]) {
          const implementation = pinned.InteractiveMode.prototype[method];
          if (typeof implementation !== "function") throw new Error(`Pinned method unavailable: ${method}`);
          owner[method] = implementation.bind(owner);
        }
      }
      const root = owned ? new owned.OwnedUiSessionShellRoot(view, home, {
        getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
        onInterrupt() {}, onExit() {}, onModelSelect() {}, onThinkingCycle() {},
      }, { quiet: true }, agentDir) : undefined;
      root?.setOutputPad(padding);
      root?.editor.setText("preserved draft");
      let surfaceOpen = false;
      try {
        for (const [index, step] of entry.steps.entries()) {
          normalizedName = step.normalizedName;
          if (pinned) {
            if (step.kind === "status") owner.showStatus(step.text);
            else if (step.kind === "error") owner.showError(step.text);
            else if (step.kind === "warning") owner.showWarning(step.text);
            else if (step.kind === "new") await owner.handleClearCommand();
            else if (step.kind === "name") owner.handleNameCommand(`/name ${step.text}`);
            else if (step.kind === "debug") owner.handleDebugCommand();
            else if (step.kind === "content") chatContainer.addChild(new Text(pinnedTheme.theme.fg("dim", step.text), padding, 0));
          } else {
            if (["status", "error", "warning"].includes(step.kind)) root.appendWorkflowMessage({ kind: step.kind, message: step.text });
            else if (step.kind === "new") root.appendWorkflowResult({ command: "new", outcome: "completed", message: "✓ New session started", messageKind: "accent" });
            else if (step.kind === "name") {
              const previous = name;
              if (step.text) name = normalizedName ?? step.text;
              root.appendWorkflowResult({
                command: "name", outcome: name ? "completed" : "failed",
                message: step.text ? `Session name set: ${name}` : previous ? `Session name: ${previous}` : "Usage: /name <name>",
                ...(name ? {} : { messageKind: "warning" }),
                ...(step.text && normalizedName !== undefined ? { detail: `Session name was normalized from ${JSON.stringify(step.text)} to ${JSON.stringify(normalizedName)}` } : {}),
              });
            } else if (step.kind === "debug") root.appendWorkflowResult({ command: "debug", outcome: "completed", message: "✓ Debug log written", detail: join(agentDir, "pi-debug.log") });
            else if (step.kind === "content") {
              view = { ...view, revision: view.revision + 1, transcript: [...view.transcript, { id: `content-${index}`, kind: "system", status: "finalized", revision: 1, title: null, text: step.text, payload: {} }] };
              root.update(view);
            }
          }
          if (step.kind === "surface") {
            surfaceOpen = step.text === "open";
            root?.setInputSurface(surfaceOpen ? { render: () => ["synthetic modal"], invalidate() {}, handleInput() {} } : null);
          }
          for (const [resizeIndex, width] of [80, 28, 80].entries()) {
            let rows;
            if (pinned) rows = chatContainer.render(width);
            else {
              const layout = root.layoutRoot();
              const transcript = layout.type === "stack" ? layout.children[0]?.node : undefined;
              if (transcript?.type !== "scroll" || transcript.id !== "transcript" || transcript.child.type !== "component") throw new Error("Missing semantic transcript region");
              rows = transcript.child.component.render(width);
            }
            results.push({ id: `${theme}/${padding}/${entry.id}/${index}/${resizeIndex}/${width}`, rows, surfaceOpen: root ? !root.usesDefaultInputSurface() : surfaceOpen });
          }
          if (root && root.editor.getText() !== "preserved draft") throw new Error("Command presentation changed editor draft");
        }
      } finally { root?.dispose(); }
    }
  }
}
process.stdout.write(JSON.stringify(results));
