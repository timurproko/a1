import { createPiEngineAdapter, type PiEngineAdapter } from "../../foundation/pi-engine-adapter/index.js";
import { OwnedPiSessionController } from "./session-controller.js";
import { OwnedUiDiagnosticsRecorder } from "./diagnostics.js";
import { createProcessTerminalHost, OwnedTerminalRuntime, type OwnedTerminalHost } from "./terminal-runtime.js";

export interface OwnedUiDevelopmentRunOptions {
  readonly cwd?: string;
  readonly host?: OwnedTerminalHost;
  readonly adapter?: PiEngineAdapter;
}

export async function runOwnedUiDevelopmentMode(
  options: OwnedUiDevelopmentRunOptions = {},
): Promise<number> {
  const adapter = options.adapter ?? await createPiEngineAdapter({ cwd: options.cwd ?? process.cwd() });
  const host = options.host ?? createProcessTerminalHost();
  const controller = new OwnedPiSessionController({
    adapter,
    width: host.columns,
    onRequestRender: () => {},
  });
  const diagnostics = controller.diagnostics();
  const runtime = new OwnedTerminalRuntime({ host, root: controller.root, diagnostics });

  let resolveStopped: (() => void) | undefined;
  const stopped = new Promise<void>(resolve => {
    resolveStopped = resolve;
  });
  const unsubscribe = adapter.onEvent(event => {
    if (event.type === "session-lifecycle" && event.lifecycle === "stopped") resolveStopped?.();
  });

  const editorInput = controller.root.editor.handleInput.bind(controller.root.editor);
  controller.root.editor.handleInput = input => {
    if (input.type === "key" && input.key === "c" && input.ctrl && controller.view().lifecycle !== "busy") {
      void controller.shutdown();
      return true;
    }
    if (input.type === "key" && input.key === "c" && input.ctrl && controller.view().lifecycle === "busy") {
      void controller.abort();
      return true;
    }
    return editorInput(input);
  };

  runtime.start();
  await adapter.flushEvents();
  if (!adapter.disposed) await stopped;
  await runtime.dispose();
  diagnostics.captureResources();
  unsubscribe();
  return 0;
}
