import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import type { OwnedUiSessionNameState, OwnedUiSessionNamingPort, OwnedUiSessionNameCompletion } from "../../../contracts/owned-ui/index.js";
import { isRecord } from "./message-values.js";

const CUSTOM_TYPE = "a1-session-naming-v1";

interface NamingPorts {
  session(): AgentSession | undefined;
  runtime(): AgentSessionRuntime | undefined;
  binding(): number;
  unavailable(): boolean;
  changed(): void;
}

/** Pi-only persistence and tool-free completion. Product policy never receives Pi session objects. */
export class PiSessionNaming implements OwnedUiSessionNamingPort {
  readonly #ports: NamingPorts;
  #applying = false;
  #changes = 0;
  #reveal: { readonly id: string; readonly from: string } | undefined;

  constructor(ports: NamingPorts) { this.#ports = ports; }

  get reveal(): { readonly id: string; readonly from: string } | undefined { return this.#reveal; }

  nameChanged(): void {
    this.#changes++;
    if (!this.#applying) this.#reveal = undefined;
  }
  reset(): void { this.#reveal = undefined; }

  state(): OwnedUiSessionNameState | null {
    const manager = this.#ports.session()?.sessionManager;
    const sessionFile = manager?.getSessionFile?.();
    if (this.#ports.unavailable() || !manager || !sessionFile) return null;
    const entries = manager.getEntries();
    const info = entries.findLast(entry => entry.type === "session_info");
    const custom = entries.findLast(entry => entry.type === "custom" && entry.customType === CUSTOM_TYPE);
    const name = manager.getSessionName() ?? null;
    const data: unknown = custom?.type === "custom" ? custom.data : undefined;
    const automatic = info !== undefined && typeof info.id === "string" && isRecord(data)
      && data.version === 1 && data.name === name && data.nameEntryId === info.id
      && typeof data.context === "string";
    return {
      sessionFile, binding: this.#ports.binding(), name, nameEntryId: info?.id ?? null,
      source: automatic ? "auto" : name?.trim() ? "user" : "unnamed",
      completedContext: automatic ? data.context as string : null,
    };
  }

  /** External edits have ordinary manual ownership and use Pi's existing session-info event/reporting path. */
  rename(expected: OwnedUiSessionNameState, name: string): boolean {
    const current = this.state(), session = this.#ports.session();
    if (!current || !session || current.sessionFile !== expected.sessionFile || current.binding !== expected.binding
      || current.nameEntryId !== expected.nameEntryId || current.name !== expected.name) return false;
    if (current.name === name) {
      if (current.source === "auto") {
        // Rationale: a same-text manual edit takes ownership without duplicating the name entry.
        session.sessionManager.appendCustomEntry(CUSTOM_TYPE, { version: 1, manual: true });
        this.nameChanged(); this.#ports.changed();
      }
      return true;
    }
    session.setSessionName(name);
    this.#ports.changed();
    return this.state()?.name === name;
  }

  async complete(request: OwnedUiSessionNameCompletion): Promise<string | null> {
    const { completeSessionName } = await import("./session-name-completion.js");
    return completeSessionName(request, this.#ports.session(), this.#ports.runtime(), this.#ports.unavailable());
  }

  apply(expected: OwnedUiSessionNameState, name: string, context: string): boolean {
    const current = this.state();
    const session = this.#ports.session();
    if (!current || !session || current.source === "user" || current.sessionFile !== expected.sessionFile
      || current.binding !== expected.binding || current.nameEntryId !== expected.nameEntryId || current.name !== expected.name) return false;
    this.#applying = true;
    this.#changes = 0;
    this.#reveal = undefined;
    try {
      session.setSessionName(name);
      const actual = session.sessionManager.getSessionName();
      const info = session.sessionManager.getEntries().findLast(entry => entry.type === "session_info");
      if (!info || actual !== name || this.#changes !== 1) return false;
      const id = session.sessionManager.appendCustomEntry(CUSTOM_TYPE, { version: 1, name, nameEntryId: info.id, context });
      this.#reveal = expected.name === name ? undefined : { id, from: expected.name ?? "" };
    } catch {
      // Security: a partial write leaves no matching provenance, so subsequent naming preserves user ownership.
      this.#reveal = undefined;
      return false;
    } finally { this.#applying = false; this.#ports.changed(); }
    return true;
  }
}
