import type { OwnedUiSessionBackend } from "../../contracts/owned-ui/index.js";
import { createHerdrReporter } from "./herdr-reporter.js";
import type { OwnedRuntimeContext } from "./runtime-context.js";

type Control = { publish(): Promise<void>; dispose(): Promise<void> };

/** Only endpoint-published bindings may reach the single native reporter. */
export class ReadySessionBinding {
  readonly #unsubscribe: () => void;
  readonly #reporter: ReturnType<typeof createHerdrReporter> | undefined;
  readonly #backend: OwnedUiSessionBackend;
  readonly #control: Control;
  #binding: number;
  #published: number | undefined;
  #publication = Promise.resolve();
  #publishing = false;
  #dirty = false;
  #stopped = false;
  #disposal: Promise<void> | undefined;

  constructor(backend: OwnedUiSessionBackend, control: Control, context: OwnedRuntimeContext, publishedBinding: number) {
    this.#backend = backend; this.#control = control;
    this.#binding = backend.identity.sessionBindingGeneration;
    this.#published = this.#binding === publishedBinding ? publishedBinding : undefined;
    this.#reporter = context.herdrBinding?.runtimeId === context.runtimeId ? createHerdrReporter({
      reservation: context.herdrBinding,
      identity: () => {
        const current = this.#identity();
        return this.#stopped || backend.identity.disposed || current.binding !== this.#published ? undefined : current;
      },
    }) : undefined;
    this.#unsubscribe = backend.session.onEvent(() => {
      if (this.#stopped || this.#binding === backend.identity.sessionBindingGeneration) return;
      this.#binding = backend.identity.sessionBindingGeneration;
      this.#publish();
    });
    if (this.#published === undefined) this.#publish();
  }

  #identity() { return { sessionId: this.#backend.identity.currentHistorySessionId() ?? this.#backend.identity.sessionId, binding: this.#backend.identity.sessionBindingGeneration }; }

  #publish(): void {
    this.#published = undefined;
    this.#dirty = true;
    if (this.#publishing) return;
    this.#publishing = true;
    this.#publication = Promise.resolve().then(async () => {
      while (this.#dirty && !this.#stopped) {
        this.#dirty = false;
        const generation = this.#identity().binding;
        try {
          await this.#control.publish();
          if (!this.#stopped && generation === this.#identity().binding) { this.#published = generation; this.#reporter?.request(); }
        } catch { /* Invariant: a failed endpoint publication never grants reporter readiness. */ }
      }
    }).finally(() => {
      this.#publishing = false;
      if (this.#dirty && !this.#stopped) this.#publish();
    });
  }

  dispose(): Promise<void> { return this.#disposal ??= this.#dispose(); }
  async #dispose(): Promise<void> {
    this.#stopped = true; this.#unsubscribe();
    await this.#publication;
    try { await this.#reporter?.dispose(); } finally { await this.#control.dispose(); }
  }
}
