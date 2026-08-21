import { assertAppRegistration, type AppRegistration } from "./contracts.js";

export class UiAppRegistry {
  readonly #byId = new Map<string, AppRegistration>();

  /** Registering a known id replaces its definition rather than adding a second app. */
  register(registration: AppRegistration): () => void {
    assertAppRegistration(registration);
    const existing = [...this.#byId.values()].find(
      candidate => candidate.route === registration.route && candidate.id !== registration.id,
    );
    if (existing) {
      throw new Error(`owned UI route ${registration.route} is already taken by ${existing.id}`);
    }
    this.#byId.set(registration.id, registration);
    return () => {
      if (this.#byId.get(registration.id) === registration) this.#byId.delete(registration.id);
    };
  }

  get(id: string): AppRegistration | null {
    return this.#byId.get(id) ?? null;
  }

  forRoute(route: string): AppRegistration | null {
    return [...this.#byId.values()].find(registration => registration.route === route) ?? null;
  }

  ids(): readonly string[] {
    return Object.freeze([...this.#byId.keys()].sort());
  }

  routes(): readonly string[] {
    return Object.freeze([...this.#byId.values()].map(registration => registration.route).sort());
  }

  clear(): void {
    this.#byId.clear();
  }
}
