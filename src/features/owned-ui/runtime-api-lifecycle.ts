import type { OwnedUiSessionBackend, UiAccentColor } from "../../contracts/owned-ui/index.js";
import type { OwnedSettingsManager } from "../../ui/settings/index.js";

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
