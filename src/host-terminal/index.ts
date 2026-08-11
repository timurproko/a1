import type { HostTerminalInputEvent, HostTerminalState, TerminalRenderTransaction, TerminalSurface } from "../domain/index.js";
import { UnixHostTerminalAdapter, type UnixHostInput } from "./unix.js";
import { WindowsHostTerminalAdapter, type WindowsHostInput } from "./windows.js";
import type { HostRendererTransaction } from "../ui/host-terminal-renderer.js";

export interface RuntimeHostTerminalAdapter {
  capture(): HostTerminalState;
  enter(): void;
  startInput(onEvents: (events: readonly HostTerminalInputEvent[]) => void): () => void;
  renderSnapshot(surface: TerminalSurface): void;
  renderTransaction(transaction: TerminalRenderTransaction): void;
  writeApplicationFrame(frame: string): void;
  restore(state?: HostTerminalState | null): void;
  installExitCleanup(): () => void;
}

export function createHostTerminalAdapter(
  input: UnixHostInput & WindowsHostInput,
  output: Pick<NodeJS.WriteStream, "write">,
  platform: NodeJS.Platform = process.platform,
  onRendererTransaction: (transaction: HostRendererTransaction) => void = () => {},
): RuntimeHostTerminalAdapter {
  return platform === "win32"
    ? new WindowsHostTerminalAdapter(input, output, undefined, onRendererTransaction)
    : new UnixHostTerminalAdapter(input, output, platform === "darwin" ? "darwin" : "linux", onRendererTransaction);
}

export * from "./unix.js";
export * from "./windows.js";
export * from "./windows-record-reader.js";
