import type { TabBridgeClient } from "../foundation/resident-tabs/bridge-client.js";
import type { ResidentTabRecovery } from "../foundation/resident-tabs/recovery.js";
import { deriveResidentTabStatus, type ResidentTabTurnSettlement } from "../features/resident-tab/status-deriver.js";
import { projectResidentTabShortcuts } from "../features/resident-tab/shortcut-projection.js";
import { readShortcutBindingsFile } from "../features/resident-tab/shortcut-bindings-file.js";
import type { PiKeybindingsHost } from "../integrations/pi/components/shell-shared-facade.js";
import type { ComposedSessionBackend } from "./session-backend.js";
import type { ResidentTabSeedPorts } from "./resident-tab-seed.js";

/**
 * The keybindings the shells borrow. Inside a resident tab the host dispatches and labels the tab
 * shortcuts this child projects from its effective declarations, so the projection is published now
 * and again after every customization reload.
 */
export function residentTabKeybindings(
  tabBridge: TabBridgeClient | null,
  agentDir: string,
  keybindingsHost: PiKeybindingsHost,
): PiKeybindingsHost {
  if (tabBridge === null) return keybindingsHost;
  const publish = () => tabBridge.shortcuts(projectResidentTabShortcuts({
    configured: readShortcutBindingsFile(agentDir),
    reserved: keybindingsHost.manager.getEffectiveConfig(),
  }).assignments);
  publish();
  return { ...keybindingsHost, reload: () => { keybindingsHost.reload(); publish(); } };
}

export async function bindResidentTabBridge(
  tabBridge: TabBridgeClient,
  backend: Pick<ComposedSessionBackend, "identity" | "session" | "workflows" | "generateResidentTabName">,
  recovery: Pick<ResidentTabRecovery, "settled"> | null = null,
  options: { readonly autoName?: boolean; readonly openRoute?: (route: "settings") => void } = {},
): Promise<() => void> {
  await tabBridge.start().catch(() => false);
  tabBridge.status("starting");
  const currentSessionFile = () => currentBackendSessionFile(backend);
  let pendingAutoName: string | null = null;
  // Invariant: while a generated name is being applied, the session name it produces is automatic
  // even if the session normalizes it; reporting it as `user` would block the strip's title
  // animation and every later automatic rename.
  let applyingAutoName = false;
  const isDefaultName = (name: string | null | undefined) => name == null || /^agent(?: \d+)?$/i.test(name);
  const currentSessionName = () => backend.session.view().status.footer?.sessionName ?? null;
  const announceSession = () => {
    const name = currentSessionName();
    // Invariant: the session may announce the applied name after the workflow resolves; the
    // first non-default name announced for a pending auto-name is that automatic name.
    if (applyingAutoName && !isDefaultName(name)) {
      pendingAutoName = name;
      applyingAutoName = false;
    }
    const automatic = name === pendingAutoName;
    const nameSource = automatic ? "auto" : isDefaultName(name) ? "default" : "user";
    tabBridge.session(currentSessionFile(), name, nameSource);
  };
  let working = false;
  // Invariant: the last turn's settlement stays reported until the next turn starts.
  let lastTurn: ResidentTabTurnSettlement | undefined;
  let autoNameAttempted = false;
  let autoNameArmed = false;
  // Invariant: naming launches once per tab during an agent run, as soon as its prompt is projected,
  // and runs beside the turn instead of waiting for it to settle.
  const launchAutoName = () => {
    if (!autoNameArmed || autoNameAttempted || options.autoName !== true || !isDefaultName(currentSessionName())) return;
    const prompt = backend.session.view().transcript.find(block => block.kind === "user")?.text.trim();
    if (!prompt) return;
    autoNameAttempted = true;
    void import("../features/resident-tab/index.js").then(({ generateAutoName }) => generateAutoName(
      prompt,
      request => backend.generateResidentTabName(request.prompt, request.maxTokens, request.signal),
    )).then(async name => {
      // Invariant: a manual rename made while generation was pending owns both the session and the tab.
      if (!isDefaultName(currentSessionName())) return;
      pendingAutoName = name;
      applyingAutoName = true;
      const result = await backend.workflows.executeWorkflow({ command: "name", argument: name });
      if (result.outcome !== "completed") {
        applyingAutoName = false;
        if (pendingAutoName === name) pendingAutoName = null;
        return;
      }
      const current = currentSessionName();
      if (current !== null && !isDefaultName(current)) {
        // Invariant: The session already holds the applied name; report it as automatic now.
        pendingAutoName = current;
        applyingAutoName = false;
        tabBridge.session(currentSessionFile(), current, "auto");
      } else {
        // Invariant: The session announces later; show the generated name meanwhile, still automatic.
        tabBridge.session(currentSessionFile(), name, "auto");
      }
    }).catch(() => { pendingAutoName = null; applyingAutoName = false; });
  };
  const reportStatus = (lifecycle?: string) => {
    const view = backend.session.view();
    const pendingRequests = view.dialog == null ? 0 : 1;
    const queuedInput = view.editor?.queuedSubmissions.length ?? 0;
    tabBridge.status(deriveResidentTabStatus({
      lifecycle: lifecycle ?? view.lifecycle,
      pendingRequests,
      queuedInput,
      ...(lastTurn === undefined ? {} : { lastTurn }),
    }), false, pendingRequests, queuedInput);
  };
  announceSession();
  const unsubscribeCommands = typeof tabBridge.onCommand === "function" ? tabBridge.onCommand(command => {
    // Invariant: visibility stays decoded for generation-1 peers but never pauses rendering; a hidden tab
    // keeps its resident terminal current while the holder withholds only its client surfaces.
    if (command.type === "rename") {
      void backend.workflows.executeWorkflow({ command: "name", argument: command.name }).catch(() => {});
    } else if (command.type === "route") {
      if (options.openRoute !== undefined) options.openRoute(command.route);
      else void backend.workflows.executeWorkflow({ command: command.route, argument: "" }).catch(() => {});
    } else if (command.type === "stop") {
      void backend.session.dispose().catch(() => {});
    }
  }) : () => {};
  const unsubscribeEvents = backend.session.onEvent(event => {
    if (event.type === "session-lifecycle") {
      const wasWorking = working;
      working = event.lifecycle === "busy";
      if (working) lastTurn = undefined;
      reportStatus(event.lifecycle);
      if (wasWorking && !working && recovery !== null) {
        void recovery.settled(currentSessionFile()).catch(() => tabBridge.degraded(true));
      }
    }
    if (event.type === "agent-run-started") {
      autoNameArmed = true;
      launchAutoName();
    }
    // Rationale: Pi starts the run before it projects the user message, so the prompt may arrive later.
    if (event.type === "transcript-block" || event.type === "session-view") launchAutoName();
    if (event.type === "agent-run-settled") {
      launchAutoName();
      autoNameArmed = false;
      lastTurn = event.aborted ? "aborted" : event.successful ? "done" : "error";
      tabBridge.prompt(event.aborted);
      reportStatus();
    }
    if (event.type === "session-view") {
      announceSession();
      reportStatus();
    }
  });
  return () => {
    unsubscribeCommands();
    unsubscribeEvents();
  };
}

/**
 * Binds a resident tab's bridge and, for an Agent tab, its seeded first prompt. Performance: the seed
 * consumer loads off the startup path; an unacknowledged seed notice waits for it in the bridge.
 */
export async function bindResidentAgentTab(
  tabBridge: TabBridgeClient,
  backend: Parameters<typeof bindResidentTabBridge>[1],
  recovery: Parameters<typeof bindResidentTabBridge>[2],
  options: Parameters<typeof bindResidentTabBridge>[3],
  seed: ResidentTabSeedPorts,
): Promise<() => void> {
  const unbind = await bindResidentTabBridge(tabBridge, backend, recovery, options);
  if (tabBridge.tabId.startsWith("settings-")) return unbind;
  let unseed = () => {};
  let unbound = false;
  void import("./resident-tab-seed.js").then(module => {
    if (!unbound) unseed = module.bindResidentTabSeed(tabBridge, seed);
  }).catch(() => {});
  return () => {
    unbound = true;
    unseed();
    unbind();
  };
}

export async function correlateResidentTabSubmission(
  recovery: Pick<ResidentTabRecovery, "correlated" | "settled">,
  backend: Pick<ComposedSessionBackend, "identity" | "session">,
  submissionId: string,
  entryId: string,
): Promise<void> {
  await recovery.correlated(submissionId, entryId);
  // Concurrency: a normal prompt command can resolve after the ready transition already fired.
  // Re-read lifecycle only after correlation is active; a concurrent ready observer and this path
  // safely race because recovery consumes the active entry once and retirement is idempotent.
  if (backend.session.view().lifecycle !== "busy") await recovery.settled(currentBackendSessionFile(backend));
}

export function currentBackendSessionFile(backend: Pick<ComposedSessionBackend, "identity">): string | null {
  const direct = backend.identity.currentSessionFile?.();
  if (direct !== undefined && direct !== null) return direct;
  const resume = backend.identity.currentSessionResumeMetadata();
  return resume === null ? null : `${resume.sessionDir}/${resume.sessionId}`;
}
