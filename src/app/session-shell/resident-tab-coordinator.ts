import type { OwnedUiEvent, PromptHistoryImageSidecarPort } from "../../contracts/owned-ui/index.js";
import type { SessionConcern } from "./session-concern.js";
import type { OwnedUiShellEngineOptions, OwnedUiSessionShellRoot } from "./session-shell-root.js";

export type ResidentTabOptions = NonNullable<OwnedUiShellEngineOptions["residentTab"]>;

export interface ResidentTabCoordinatorPorts {
  readonly root: Pick<OwnedUiSessionShellRoot, "appendWorkflowStatus" | "rehydrateHistoryText" | "editor">;
}

/**
 * The session presenter's side of a resident tab: recovered input, the idle status it reports to
 * the strip, prompt admission and correlation through the recovery journal, draft checkpoints,
 * detach on quit, and the graceful stop when the presenter is released. Outside a resident tab
 * every operation is a no-op.
 */
export class ResidentTabCoordinator implements SessionConcern {
  readonly #options: ResidentTabOptions | undefined;
  readonly #ports: ResidentTabCoordinatorPorts;

  constructor(options: ResidentTabOptions | undefined, ports: ResidentTabCoordinatorPorts) {
    this.#options = options;
    this.#ports = ports;
  }

  /** True inside a resident tab, where Settings and the session name live in the global strip. */
  get active(): boolean {
    return this.#options !== undefined;
  }

  checkpoint(text: string): void {
    this.#options?.checkpoint?.(text);
  }

  closeOwnedRoute(route: string): void {
    this.#options?.closeOwnedRoute?.(route);
  }

  /** Puts the prompts and draft a previous tab process left unfinished back into the editor. */
  restoreInput(imageSidecar?: PromptHistoryImageSidecarPort): void {
    const recovered = this.#options?.recovered;
    if (recovered === undefined) return;
    const { root } = this.#ports;
    const prompts = recovered.prompts
      .map(prompt => root.rehydrateHistoryText(prompt.text, id => imageSidecar?.readAttachment(id) ?? null))
      .filter(Boolean);
    if (prompts.length > 0) {
      root.editor.setText(prompts[0]!);
      if (recovered.draft) root.editor.addToHistory(recovered.draft);
      for (const additional of prompts.slice(1)) root.editor.addToHistory(additional);
      root.appendWorkflowStatus(recovered.draft
        ? `Recovered an unfinished prompt; the prior draft and ${Math.max(0, prompts.length - 1)} additional prompt${prompts.length === 2 ? "" : "s"} are in editor history.`
        : `Recovered an unfinished prompt${prompts.length > 1 ? `; ${prompts.length - 1} additional prompts are in editor history` : ""}.`);
    } else if (recovered.draft) {
      root.editor.setText(recovered.draft);
      root.appendWorkflowStatus("Recovered the editor draft from the previous tab process.");
    }
  }

  /** Reports idle to the strip whenever the session leaves its busy lifecycle. */
  observeLifecycle(event: OwnedUiEvent): void {
    if (event.type === "session-lifecycle" && event.lifecycle !== "busy") this.#options?.reportStatus?.("idle");
  }

  /** Journals a prompt before it is sent; undefined outside a resident tab. Rejects when the journal cannot sync. */
  admit(input: Parameters<NonNullable<ResidentTabOptions["admit"]>>[0]): Promise<{ readonly id: string } | undefined> {
    return this.#options?.admit?.(input) ?? Promise.resolve(undefined);
  }

  /** The admitted prompt reached the engine; its journal entry is correlated with the engine's entry. */
  async dispatched(submissionId: string, entryId: string): Promise<void> {
    this.#options?.dispatched?.();
    await this.#options?.correlated?.(submissionId, entryId).catch(() => undefined);
  }

  /**
   * Leaves the tab without stopping its engine. Returns undefined outside a resident tab, true when
   * the client detached, or the notice to show when detaching is unavailable.
   */
  async detach(): Promise<true | string | undefined> {
    const resident = this.#options;
    if (resident === undefined) return undefined;
    const detached = await resident.requestDetach().catch(() => false);
    return detached ? true : resident.unavailableNotice ?? "Press Ctrl+C twice to leave; this agent keeps running.";
  }

  gracefulStop(sessionFile: string | null): Promise<void> {
    return this.#options?.gracefulStop?.(sessionFile) ?? Promise.resolve();
  }

  dispose(): void {}
}
