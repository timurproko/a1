import type { OwnedUiSessionViewModel } from "../../../src/foundation/owned-ui-contracts/index.js";
import { PiSessionShellRoot } from "../../../src/features/owned-ui/index.js";
import { normalizeRow, type StartupCapture, type StartupCaptureState } from "./pi-upstream-startup-fixture.js";

/** AddOne producer. It deliberately shares no composition implementation with the upstream producer. */
export function captureAddOneStartup(state: StartupCaptureState): StartupCapture {
  const root = new PiSessionShellRoot(toView(state), state.cwd, {
    getColumns: () => state.width,
    getRows: () => 24,
    requestRender() {},
    onSubmit() {},
    onInterrupt() {},
    onExit() {},
    onModelSelect() {},
    onThinkingCycle() {},
  }, {
    quiet: state.quiet,
    expanded: state.expanded,
    notices: state.notices,
  });
  const rows = root.render(state.width).map(normalizeRow);
  root.dispose();
  return { id: state.id, width: state.width, rows };
}

function toView(state: StartupCaptureState): OwnedUiSessionViewModel {
  return {
    contractVersion: 1,
    sessionId: `startup-${state.id}`,
    revision: 1,
    lifecycle: state.lifecycle,
    transcript: [],
    editor: {
      text: "",
      queuedSubmissions: [],
      selection: null,
      cursorOffset: 0,
      historyRevision: 0,
      submitEnabled: true,
    },
    status: {
      title: "Pi",
      workingMessage: state.workingMessage,
      diagnostics: [],
      badges: [state.lifecycle],
    },
    terminal: { columns: state.width, rows: 24, focusedRegion: "editor", hardwareCursor: false },
    activeModel: state.model === null ? null : {
      providerId: state.model.providerId,
      modelId: state.model.modelId,
      displayName: state.model.modelId,
    },
    thinkingLevel: state.thinkingLevel,
    activeCommandIds: [],
    dialog: null,
    overlay: null,
    customizations: [],
    diagnostics: [],
  };
}
