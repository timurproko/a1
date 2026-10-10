import {
  CancellableLoader,
  Spacer,
  Text,
  type Component,
} from "@earendil-works/pi-tui";
import { BorderedLoader, DynamicBorder } from "../startup-public.js";
import { adoptPiModalFrame, PiModalFrame } from "./modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, paintPiBorder, piTheme, renderPiModalShortcutHints } from "./theme.js";
import {
  componentPort,
  createTuiFacade,
  ensureTheme,
  type PiShellComponentPort,
  type PiShellEditorOptions,
} from "./shell-shared-facade.js";

export interface PiShellOperationLoaderPort extends PiShellComponentPort {
  readonly signal: AbortSignal;
}

/** Bare A1's titled share progress surface; the pinned comparison keeps its bordered loader. */
class ShareOperationDialog implements Component {
  readonly #loader: CancellableLoader;
  readonly #frame: PiModalFrame;

  constructor(
    runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
    message: string,
  ) {
    const theme = piTheme();
    this.#loader = new CancellableLoader(
      createTuiFacade(runtime),
      text => theme.fg("accent", text),
      text => theme.fg("muted", text),
      message,
    );
    this.#frame = new PiModalFrame(
      new DynamicBorder(paintPiBorder),
      [
        new Text(theme.fg("accent", theme.bold("Share")), 0, 0),
        this.#loader,
        new Spacer(1),
        new Text(renderPiModalShortcutHints([DIALOG_CLOSE_SHORTCUT_HINT]), 0, 0),
      ],
      new DynamicBorder(paintPiBorder),
    );
  }

  get signal(): AbortSignal { return this.#loader.signal; }
  invalidate(): void { this.#frame.invalidate(); }
  render(width: number): string[] { return this.#frame.render(width); }
  handleInput(data: string): void { this.#loader.handleInput(data); }
  dispose(): void { this.#loader.dispose(); }
}

export function createPiShellShareOperationDialog(
  runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
  message: string,
): PiShellOperationLoaderPort {
  ensureTheme();
  const dialog = new ShareOperationDialog(runtime, message);
  return { ...componentPort(dialog), signal: dialog.signal };
}

export function createPiShellOperationLoader(
  runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">,
  message: string,
): PiShellOperationLoaderPort {
  ensureTheme();
  const loader = new BorderedLoader(createTuiFacade(runtime), piTheme(), message, { cancellable: true });
  adoptPiModalFrame(loader, {
    topIndex: 0,
    bottomIndex: loader.children.length - 1,
    preInsetContent: loader.children[3] === undefined ? [] : [loader.children[3]],
  });
  return { ...componentPort(loader), signal: loader.signal };
}
