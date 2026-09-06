import { WindowsNativeProcessInspector, type InspectorCommandRunner } from "./windows-process-inspector.js";

/** Verifies Darwin process identity through the bounded native guardian inspection command. */
export class DarwinNativeProcessInspector extends WindowsNativeProcessInspector {
  constructor(helperPath: string, runner?: InspectorCommandRunner) {
    super(helperPath, runner, "darwin-proc-start:");
  }
}
