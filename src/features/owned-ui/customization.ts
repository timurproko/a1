import {
  assertOwnedUiCustomization,
  type OwnedUiCommand,
  type OwnedUiCustomization,
  type OwnedUiSlotId,
  type OwnedUiTranscriptBlock,
} from "../../foundation/owned-ui-contracts/index.js";
import { renderPiShellTranscriptBlock } from "../../foundation/pi-component-adapter/index.js";

export interface OwnedUiSlotImplementation {
  readonly payload: unknown;
  render?(input: unknown, width: number): readonly string[];
  createCommand?(context: { readonly sessionId: string; readonly correlationId: string }): OwnedUiCommand | Promise<OwnedUiCommand>;
}

export interface OwnedCommandHandlerContext {
  readonly sessionId: string;
  readonly correlationId: string;
}

export type OwnedCommandHandler = (context: OwnedCommandHandlerContext) => OwnedUiCommand | Promise<OwnedUiCommand>;

export class OwnedCommandSurface {
  readonly #handlers = new Map<string, OwnedCommandHandler>();
  #sequence = 0;

  register(name: string, handler: OwnedCommandHandler): () => void {
    this.#handlers.set(name, handler);
    return () => this.#handlers.delete(name);
  }

  names(): readonly string[] {
    return [...this.#handlers.keys()].sort();
  }

  async dispatch(name: string, sessionId: string): Promise<OwnedUiCommand> {
    const handler = this.#handlers.get(name);
    if (!handler) throw new Error(`unknown owned UI command: ${name}`);
    this.#sequence += 1;
    return handler({ sessionId, correlationId: `ui-command-${this.#sequence}` });
  }
}

interface RegisteredCustomization {
  readonly customization: OwnedUiCustomization;
  readonly implementation: OwnedUiSlotImplementation;
}

export interface ResolvedOwnedUiSlot {
  readonly customization: OwnedUiCustomization;
  readonly implementation: OwnedUiSlotImplementation;
}

export class OwnedUiCustomizationRegistry {
  readonly #registrations = new Map<OwnedUiSlotId, Map<string, RegisteredCustomization>>();

  register(
    customization: OwnedUiCustomization,
    implementation: OwnedUiSlotImplementation,
  ): () => void {
    assertOwnedUiCustomization(customization);
    if (typeof implementation !== "object" || implementation === null) {
      throw new TypeError("owned UI slot implementation is invalid");
    }
    const slot = this.#slot(customization.slot);
    slot.set(customization.id, Object.freeze({ customization, implementation }));
    return () => {
      if (slot.get(customization.id)?.customization.version === customization.version) slot.delete(customization.id);
    };
  }

  resolve(slot: OwnedUiSlotId): ResolvedOwnedUiSlot | undefined {
    return [...(this.#registrations.get(slot)?.values() ?? [])]
      .sort((left, right) =>
        right.customization.precedence - left.customization.precedence
        || right.customization.version - left.customization.version
        || left.customization.id.localeCompare(right.customization.id)
      )[0];
  }

  registrations(slot: OwnedUiSlotId): readonly OwnedUiCustomization[] {
    return [...(this.#registrations.get(slot)?.values() ?? [])]
      .map(registration => registration.customization)
      .sort((left, right) => right.precedence - left.precedence || right.version - left.version || left.id.localeCompare(right.id));
  }

  remove(id: string): boolean {
    for (const slot of this.#registrations.values()) {
      if (slot.delete(id)) return true;
    }
    return false;
  }

  all(): readonly OwnedUiCustomization[] {
    return [...this.#registrations.values()]
      .flatMap(slot => [...slot.values()].map(registration => registration.customization))
      .sort((left, right) => left.slot.localeCompare(right.slot) || right.precedence - left.precedence || left.id.localeCompare(right.id));
  }

  clear(): void {
    this.#registrations.clear();
  }

  installCommands(surface: OwnedCommandSurface, sessionId: string): readonly string[] {
    const installed: string[] = [];
    for (const registration of this.#registrations.get("command")?.values() ?? []) {
      if (!registration.implementation.createCommand) continue;
      installed.push(registration.customization.id);
      surface.register(registration.customization.id, context => {
        if (context.sessionId !== sessionId) throw new Error("owned UI command session does not match the registry binding");
        return registration.implementation.createCommand!(context);
      });
    }
    return installed;
  }

  #slot(slot: OwnedUiSlotId): Map<string, RegisteredCustomization> {
    let registrations = this.#registrations.get(slot);
    if (!registrations) {
      registrations = new Map();
      this.#registrations.set(slot, registrations);
    }
    return registrations;
  }
}

export function createVanillaUiCustomizationRegistry(): OwnedUiCustomizationRegistry {
  const registry = new OwnedUiCustomizationRegistry();
  const register = (
    slot: OwnedUiSlotId,
    id: string,
    label: string,
    implementation: OwnedUiSlotImplementation = { payload: {} },
  ) => registry.register({
    id,
    slot,
    version: 1,
    precedence: 0,
    label,
    payload: {},
  }, implementation);

  register("theme", "vanilla-theme", "Vanilla Pi style", {
    payload: { background: "terminal", foreground: "terminal", accent: "blue" },
  });
  register("transcript-block", "vanilla-transcript", "Vanilla transcript", {
    payload: {},
    render: (input, width) => renderPiShellTranscriptBlock(input as OwnedUiTranscriptBlock, width, process.cwd()),
  });
  register("tool-card", "vanilla-tool-card", "Vanilla tool cards");
  register("editor", "vanilla-editor", "Vanilla editor");
  register("status", "vanilla-status", "Vanilla status");
  register("selector", "vanilla-selector", "Vanilla selector");
  register("dialog", "vanilla-dialog", "Vanilla dialog");
  register("overlay", "vanilla-overlay", "Vanilla overlay");
  register("layout", "vanilla-fullscreen", "Fullscreen session");
  return registry;
}
