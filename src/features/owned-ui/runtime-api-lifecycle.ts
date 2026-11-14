import type { OwnedUiSessionBackend, UiAccentColor } from "../../contracts/owned-ui/index.js";
import type { OwnedSettingsManager } from "../../ui/settings/index.js";
import { createHerdrReporter } from "./herdr-reporter.js";
import type { OwnedRuntimeContext } from "./runtime-context.js";

type Control = { publish(): Promise<void>; dispose(): Promise<void> };

/** Settings-driven API lifetime shared by every normal-product launcher. */
export class RuntimeApiLifecycle {
  readonly #unsubscribe: () => void;
  readonly #unbind: () => void;
  readonly #startControl: () => Promise<{ dispose(): Promise<void> }>;
  #control: Promise<{ dispose(): Promise<void> } | null> | undefined;
  #stopped = false;
  #disposal: Promise<void> | undefined;

  constructor(backend: OwnedUiSessionBackend, settings: OwnedSettingsManager, apply: (color: UiAccentColor) => void,
    startControl: () => Promise<{ dispose(): Promise<void> }>) {
    this.#startControl = startControl;
    this.#unsubscribe = settings.onChange(current => apply(current.value("accentColor")));
    let binding = backend.identity.sessionBindingGeneration;
    this.#unbind = backend.session.onEvent(() => {
      if (binding === backend.identity.sessionBindingGeneration) return;
      binding = backend.identity.sessionBindingGeneration;
      settings.startSession();
    });
  }

  start(): void {
    if (this.#control || this.#stopped) return;
    this.#control = Promise.resolve().then(() => this.#stopped ? null : this.#startControl()).catch(() => null);
  }

  dispose(): Promise<void> { return this.#disposal ??= this.#dispose(); }
  async #dispose(): Promise<void> {
    this.#stopped = true;
    this.#unbind(); this.#unsubscribe();
    await (await this.#control)?.dispose();
  }
}

/** Only endpoint-published bindings may reach the single native reporter. */
export class ReadySessionBinding {
  readonly #unsubscribe: () => void;
  readonly #reporter: ReturnType<typeof createHerdrReporter> | undefined;
  readonly #backend: OwnedUiSessionBackend;
  readonly #control: Control;
  #binding: number;
  #published: number | undefined;
  #publication = Promise.resolve();
  #stopped = false;
  #disposal: Promise<void> | undefined;

  constructor(backend: OwnedUiSessionBackend, control: Control, context: OwnedRuntimeContext, publishedBinding: number) {
    this.#backend = backend; this.#control = control;
    this.#binding = backend.identity.sessionBindingGeneration;
    this.#published = this.#binding === publishedBinding ? publishedBinding : undefined;
    this.#reporter = context.herdrBinding?.runtimeId === context.runtimeId ? createHerdrReporter({
      reservation: context.herdrBinding,
      identity: () => {
        const current = this.identity();
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

  identity() { return { sessionId: this.#backend.identity.currentHistorySessionId() ?? this.#backend.identity.sessionId, binding: this.#backend.identity.sessionBindingGeneration }; }

  #publish(): void {
    this.#published = undefined;
    this.#publication = this.#publication.then(async () => {
      if (this.#stopped) return;
      const generation = this.identity().binding;
      await this.#control.publish();
      if (!this.#stopped && generation === this.identity().binding) { this.#published = generation; this.#reporter?.request(); }
    }).catch(() => {});
  }

  dispose(): Promise<void> { return this.#disposal ??= this.#dispose(); }
  async #dispose(): Promise<void> {
    this.#stopped = true; this.#unsubscribe();
    await this.#publication;
    try { await this.#reporter?.dispose(); } finally { await this.#control.dispose(); }
  }
}
