import type {
  OwnedUiCommandResult,
  OwnedUiDialogHost,
  OwnedUiSessionBackend,
  OwnedUiShellSkillSummary,
  OwnedUiWorkflowRequest,
} from "../../contracts/owned-ui/index.js";
import type { SessionDialogCoordinator } from "./dialog-coordinator.js";
import type { OwnedUiPresenterTerminal } from "./shell-host.js";
import type { OwnedUiSessionShellOptions, OwnedUiSessionShellRoot } from "./session-shell-root.js";
import type { WorkflowSelectors } from "./workflow-router.js";

/** What the selectors need from the session; typed ports, never the presenter. */
export interface SessionSelectorPorts {
  readonly root: Pick<OwnedUiSessionShellRoot, "setInputSurface" | "setFooterLevel" | "workflow" | "editor">;
  readonly terminal: OwnedUiPresenterTerminal;
  readonly dialogs: SessionDialogCoordinator;
  readonly presenters: OwnedUiSessionShellOptions["presenters"];
  readonly backend: Pick<OwnedUiSessionBackend, "catalog" | "settings">;
  readonly customViewport: boolean;
  disposed(): boolean;
  runWorkflow(request: OwnedUiWorkflowRequest): Promise<OwnedUiCommandResult>;
  sendSlashPrompt(text: string, typed: string): Promise<OwnedUiCommandResult>;
  reportError(): void;
  input(title: string, placeholder: string, options?: { readonly retainSurfaceOnSettle?: boolean }): Promise<string | undefined>;
  shutdown(): void;
}

/**
 * Opens the session's selectors and dialogs in the input dock and runs each choice as a workflow.
 * Invariant: the workflow router reaches dialogs only through this collaborator, never through the presenter.
 */
export class SessionSelectors implements WorkflowSelectors {
  readonly #ports: SessionSelectorPorts;
  readonly #root: SessionSelectorPorts["root"];
  readonly #terminal: OwnedUiPresenterTerminal;
  readonly #dialogs: SessionDialogCoordinator;
  readonly #presenters: SessionSelectorPorts["presenters"];
  readonly #backend: SessionSelectorPorts["backend"];
  readonly #customViewport: boolean;
  // Invariant: the host's optional members follow the layout, so it is built only once the layout is known.
  readonly #dialogHost: OwnedUiDialogHost;

  constructor(ports: SessionSelectorPorts) {
    this.#ports = ports;
    this.#root = ports.root;
    this.#terminal = ports.terminal;
    this.#dialogs = ports.dialogs;
    this.#presenters = ports.presenters;
    this.#backend = ports.backend;
    this.#customViewport = ports.customViewport;
    this.#dialogHost = this.#createDialogHost();
  }

  // Rationale: presenters see the shell only as a dialog host; selectors open in the input dock and run choices as workflows.
  #createDialogHost(): OwnedUiDialogHost {
    const isDisposed = () => this.#ports.disposed();
    return {
      get disposed() { return isDisposed(); },
      setInputSurface: surface => this.#root.setInputSurface(surface),
      requestRender: () => this.#terminal.requestRender(),
      viewport: () => this.#terminal.viewport(),
      appendWorkflowStatus: text => this.#root.workflow.appendStatus(text),
      appendWorkflowResult: result => this.#root.workflow.appendResult(result),
      runWorkflow: request => this.#ports.runWorkflow(request),
      // Invariant: the custom bare-A1 surface holds frames while optional selectors load and is permanently
      // fullscreen; the pinned comparison profiles render immediately and keep Pi's TUI mode switch.
      ...(this.#customViewport
        ? { beginPresentationHold: () => this.#terminal.beginPresentationHold() }
        : { switchTuiMode: mode => this.#terminal.switchMode(mode) }),
    };
  }

  async showThinkingSelector(): Promise<void> {
    const snapshot = this.#backend.settings.snapshot();
    const close = () => {
      this.#root.setFooterLevel(true);
      this.#root.setInputSurface(null);
      this.#terminal.requestRender();
    };
    const select = (level: string) => {
      close();
      void this.#ports.runWorkflow({ command: "thinking", argument: "", selection: level });
    };
    const releasePresentation = this.#customViewport ? this.#terminal.beginPresentationHold() : undefined;
    try {
      const selectors = await this.#presenters.components.dialogs.lazySelectors();
      const component = await selectors.createThinking({
        currentLevel: snapshot.thinkingLevel,
        availableLevels: snapshot.availableThinkingLevels,
        onSelect: select,
        onCancel: close,
        onSelectAsDefault: level => this.#backend.settings.setDefaultThinkingLevel(level),
        defaultLevel: snapshot.defaultThinkingLevel,
        ...(this.#backend.settings.productMode === "bare" ? {
          presentation: {
            profile: "bare" as const,
            cycleBinding: this.#root.editor.keybindingConfig()["app.thinking.cycle"] ?? [],
          },
        } : {}),
      });
      if (this.#ports.disposed()) return;
      this.#root.setFooterLevel(false);
      this.#present(component);
    } finally {
      releasePresentation?.();
    }
  }

  /** Applies a dock-selected skill through the prompt path. */
  showSkillsSelector(skills: readonly OwnedUiShellSkillSummary[]): Promise<void> | undefined {
    const close = this.#dialogs.closeInputSurface;
    const component = this.#presenters.components.dialogs.skillsSelector({
      skills,
      onSelect: name => {
        close();
        void this.#ports.sendSlashPrompt(this.#presenters.components.skills.prompt(name), this.#presenters.components.skills.prompt(name)).catch(() => this.#ports.reportError());
      },
      onCancel: close,
    });
    this.#present(component);
    return component.ready;
  }

  showModelSelector(initialSearchInput?: string): void {
    this.#presenters.openModelSelector(this.#dialogHost, initialSearchInput);
  }

  showForkSelector(): void {
    const options = this.#backend.catalog.pinnedForkOptions();
    if (options.length === 0) {
      this.#root.workflow.appendResult({ command: "fork", outcome: "completed", message: "No messages to fork from", messageKind: "status" });
      this.#terminal.requestRender();
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const component = this.#presenters.components.dialogs.userMessageSelector(options, selection => {
      close();
      void this.#ports.runWorkflow({ command: "fork", argument: "", selection });
    }, close);
    this.#present(component);
  }

  async showLogoutSelector(): Promise<void> {
    let options;
    try {
      options = await this.#backend.catalog.pinnedLogoutOptions();
    } catch (error) {
      this.#root.workflow.appendResult({
        command: "logout",
        outcome: "failed",
        message: `Could not read stored credentials: ${error instanceof Error ? error.message : String(error)}`,
      });
      this.#terminal.requestRender();
      return;
    }
    if (options.length === 0) {
      this.#root.workflow.appendStatus("No stored credentials to remove. /logout only removes credentials saved by /login; environment variables and models.json config are unchanged.");
      this.#terminal.requestRender();
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const component = this.#presenters.components.dialogs.authProviderSelector("logout", options, selection => {
      close();
      void this.#ports.runWorkflow({ command: "logout", argument: "", selection });
    }, close);
    this.#present(component);
  }

  showLoginMethodSelector(providerReference: string): void {
    const method = this.#backend.catalog.pinnedLoginMethodOptions(providerReference);
    if (method.options.length === 0) {
      this.showLoginProviderSelector(undefined, providerReference);
      return;
    }
    if (method.options.length === 1) {
      const selection = method.options[0]?.id;
      if (selection) void this.#ports.runWorkflow({ command: "login", argument: "", selection });
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const labels = method.options.map(option => option.label);
    const component = this.#presenters.components.dialogs.extensionSelector(method.title, labels, label => {
      const selection = method.options.find(option => option.label === label)?.id;
      if (!selection) return;
      close();
      void this.#ports.runWorkflow({ command: "login", argument: "", selection });
    }, close);
    this.#present(component);
  }

  showTreeSelector(initialSelectedId?: string): Promise<void> {
    return this.#presenters.openTreeSelector(this.#dialogHost, (entryId, skipSummaryPrompt) => {
      void this.#completeTreeSelection(entryId, skipSummaryPrompt);
    }, initialSelectedId);
  }

  showLoginAuthTypeSelector(): void {
    const close = this.#dialogs.closeInputSurface;
    const labels = ["Sign in with an account", "Sign in with an API key"];
    const component = this.#presenters.components.dialogs.extensionSelector(
      "Select authentication method:",
      labels,
      label => {
        close();
        this.showLoginProviderSelector(label === labels[0] ? "oauth" : "api_key");
      },
      close,
    );
    this.#present(component);
  }

  showLoginProviderSelector(authType?: "oauth" | "api_key", initialSearchInput?: string): void {
    const options = this.#backend.catalog.pinnedLoginOptions(authType);
    if (options.length === 0) {
      this.#root.workflow.appendStatus(authType === "oauth" ? "No account providers available." : authType === "api_key" ? "No API key providers available." : "No login providers available.");
      this.#terminal.requestRender();
      return;
    }
    const close = this.#dialogs.closeInputSurface;
    const component = this.#presenters.components.dialogs.authProviderSelector("login", options, id => {
      close();
      void this.#ports.runWorkflow({ command: "login", argument: "", selection: id });
    }, () => {
      close();
      if (authType !== undefined) this.showLoginAuthTypeSelector();
    }, initialSearchInput);
    this.#present(component);
  }

  showSessionSelector(): Promise<void> {
    return this.#presenters.openSessionSelector(this.#dialogHost, () => { void this.#ports.shutdown(); });
  }

  showSettingsSelector(): void {
    this.#presenters.openSettingsSelector(this.#dialogHost);
  }

  showTrustSelector(): Promise<void> | undefined {
    const context = this.#backend.catalog.pinnedProjectTrustContext();
    const close = this.#dialogs.closeInputSurface;
    const component = this.#presenters.components.dialogs.trustSelector({
      ...context,
      onSelect: selection => {
        try {
          this.#backend.catalog.persistProjectTrust(selection.updates);
          close();
          this.#root.workflow.appendStatus(`Saved trust decision: ${selection.trusted ? "trusted" : "untrusted"}. Restart pi for this to take effect.`);
        } catch (error) {
          close();
          this.#root.workflow.appendResult({ command: "trust", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
        }
        this.#terminal.requestRender();
      },
      onCancel: close,
    });
    this.#present(component);
    return component.ready;
  }

  showScopedModelsSelector(): void {
    this.#presenters.openScopedModelsSelector(this.#dialogHost);
  }

  /** The bare-A1 unified Models dialog: switch on Enter, scope on Space, persist on Ctrl+S, all through the engine. */
  showModelsDialog(initialQuery?: string): void | Promise<void> {
    return this.#presenters.openModelsDialog(this.#dialogHost, initialQuery);
  }

  #treeSummary(): Promise<string | undefined> {
    return new Promise(resolve => {
      this.#root.setInputSurface(this.#presenters.components.dialogs.extensionSelector(
        "Summarize Branch?",
        ["No summary", "Summarize", "Summarize with custom prompt"],
        resolve,
        () => resolve(undefined),
      ), true, "opaque");
      this.#terminal.requestRender();
    });
  }

  async #completeTreeSelection(entryId: string, skipSummaryPrompt: boolean): Promise<void> {
    let summarize = false;
    let customInstructions: string | undefined;
    if (!skipSummaryPrompt) {
      while (true) {
        const choice = await this.#treeSummary();
        if (choice === undefined) {
          await this.showTreeSelector(entryId);
          return;
        }
        summarize = choice !== "No summary";
        if (choice === "Summarize with custom prompt") {
          customInstructions = await this.#ports.input("Custom Summarization Instructions", "", { retainSurfaceOnSettle: true });
          if (customInstructions === undefined) continue;
        }
        break;
      }
    }
    this.#root.setInputSurface(null);
    this.#terminal.requestRender();
    const result = await this.#ports.runWorkflow({
      command: "tree",
      argument: "",
      selection: entryId,
      treeSummary: {
        summarize,
        ...(customInstructions === undefined ? {} : { customInstructions }),
      },
    });
    if (result.diagnostic === "Branch summarization cancelled") await this.showTreeSelector(entryId);
  }

  // Performance: retain the frame until a deferred selector is ready.
  #present(component: Parameters<SessionSelectorPorts["root"]["setInputSurface"]>[0]): void {
    const release = component?.ready === undefined ? undefined : this.#terminal.beginPresentationHold();
    this.#root.setInputSurface(component);
    void component?.ready?.finally(() => { release?.(); if (!this.#ports.disposed()) this.#terminal.requestRender(); });
    this.#terminal.requestRender();
  }
}
