import type { OwnedUiSessionViewModel } from "../../contracts/owned-ui/index.js";
import type { PiShellComponentPort } from "../../integrations/pi/components/shell-shared-facade.js";

export type ExtensionWidgetPlacement = "aboveEditor" | "belowEditor";

/**
 * What extensions draw into the shell: a header that replaces the built-in one, a footer, widgets
 * above and below the editor, footer statuses, and a working message. It owns those components and
 * disposes each one it replaces; the root decides what to invalidate after a change.
 */
export class ExtensionSurface {
  #header: PiShellComponentPort | null = null;
  #footer: PiShellComponentPort | null = null;
  readonly #widgets = new Map<string, { readonly component: PiShellComponentPort; readonly placement: ExtensionWidgetPlacement }>();
  readonly #statuses = new Map<string, string>();
  #workingMessage: string | undefined;
  #workingVisible = true;

  get header(): PiShellComponentPort | null {
    return this.#header;
  }

  get footer(): PiShellComponentPort | null {
    return this.#footer;
  }

  get working(): { readonly message: string | undefined; readonly visible: boolean } {
    return { message: this.#workingMessage, visible: this.#workingVisible };
  }

  placeWidget(key: string, component: PiShellComponentPort | null, placement: ExtensionWidgetPlacement): void {
    const previous = this.#widgets.get(key)?.component;
    if (component === null) this.#widgets.delete(key);
    else this.#widgets.set(key, { component, placement });
    if (previous !== undefined && previous !== component) previous.dispose?.();
  }

  replaceHeader(component: PiShellComponentPort | null): void {
    if (this.#header !== component) this.#header?.dispose?.();
    this.#header = component;
  }

  replaceFooter(component: PiShellComponentPort | null): void {
    if (this.#footer !== component) this.#footer?.dispose?.();
    this.#footer = component;
  }

  setStatus(key: string, text: string | undefined): void {
    if (text === undefined) this.#statuses.delete(key);
    else this.#statuses.set(key, text);
  }

  setWorking(message: string | undefined, visible: boolean): void {
    this.#workingMessage = message;
    this.#workingVisible = visible;
  }

  statuses(): Map<string, string> {
    return new Map(this.#statuses);
  }

  /** The view with extension statuses merged over the engine's footer statuses. */
  withStatuses(view: OwnedUiSessionViewModel): OwnedUiSessionViewModel {
    const footer = view.status.footer;
    const statuses = new Map(footer?.extensionStatuses ?? []);
    for (const [key, text] of this.#statuses) statuses.set(key, text);
    return {
      ...view,
      status: {
        ...view.status,
        footer: {
          ...footer,
          branch: footer?.branch ?? null,
          sessionName: footer?.sessionName ?? null,
          availableProviderCount: footer?.availableProviderCount ?? 1,
          extensionStatuses: [...statuses],
        },
      },
    };
  }

  renderWidgets(placement: ExtensionWidgetPlacement, width: number): readonly string[] {
    const rows = [...this.#widgets.values()]
      .filter(widget => widget.placement === placement)
      .flatMap(widget => widget.component.render(width));
    return placement === "aboveEditor" ? ["", ...rows] : rows;
  }

  invalidate(): void {
    this.#header?.invalidate();
    this.#footer?.invalidate();
    for (const { component } of this.#widgets.values()) component.invalidate();
  }

  /** Disposes and forgets everything an extension set; working visibility is the extension's own choice and stays. */
  reset(): void {
    this.#header?.dispose?.();
    this.#footer?.dispose?.();
    for (const { component } of this.#widgets.values()) component.dispose?.();
    this.#header = null;
    this.#footer = null;
    this.#widgets.clear();
    this.#statuses.clear();
    this.#workingMessage = undefined;
  }

  dispose(): void {
    this.#header?.dispose?.();
    this.#footer?.dispose?.();
    for (const { component } of this.#widgets.values()) component.dispose?.();
    this.#widgets.clear();
  }
}
