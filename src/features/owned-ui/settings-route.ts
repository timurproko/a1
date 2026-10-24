export const SETTINGS_APP_ID = "settings";
/**
 * Asks the open Settings screen to open one setting's dialog, such as the plus menu a strip request
 * opens in the Settings tab. A request made before the screen listens waits for it.
 */
export class SettingsDialogRequests {
  #listener: ((id: string) => void) | null = null;
  #pending: string | null = null;

  request(id: string): void {
    if (this.#listener === null) this.#pending = id;
    else this.#listener(id);
  }

  /** One listener at a time; `null` stops listening. */
  listen(listener: ((id: string) => void) | null): void {
    this.#listener = listener;
    const pending = this.#pending;
    if (listener === null || pending === null) return;
    this.#pending = null;
    listener(pending);
  }
}

export const SETTINGS_ROUTE = "settings";
