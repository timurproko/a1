import type { OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";
import { OwnedUiSessionShellRoot } from "../../../src/integrations/pi/session-ui/index.js";
import { createPiShellFooter } from "../../../src/integrations/pi/components/index.js";
import { normalizeRow, type StartupCapture, type StartupCaptureState } from "./pi-upstream-startup-fixture.js";

/** A1 producer. It deliberately shares no composition implementation with the upstream producer. */
export function captureOwnedStartup(state: StartupCaptureState): StartupCapture {
  const root = new OwnedUiSessionShellRoot(toView(state), state.cwd, {
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

export function captureOwnedFooterRows(state: StartupCaptureState): readonly string[] {
  return createPiShellFooter(toView(state), state.cwd).render(state.width);
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
      ...(state.usage === undefined ? {} : { usage: {
        ...state.usage,
        latestCacheHitRate: state.usage.cacheRead > 0
          ? (state.usage.cacheRead / (state.usage.input + state.usage.cacheRead + state.usage.cacheWrite)) * 100
          : null,
        autoCompactEnabled: true,
      } }),
      footer: {
        branch: state.branch ?? null,
        sessionName: state.sessionName ?? null,
        availableProviderCount: state.availableProviderCount ?? 1,
        extensionStatuses: [],
      },
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
