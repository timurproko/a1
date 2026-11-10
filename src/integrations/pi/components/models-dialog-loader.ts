import type { OwnedUiShellComponentPort } from "../../../contracts/owned-ui/index.js";
import type { ModelsDialogComponent, ModelsDialogConfig, ModelsDialogCallbacks, ModelsDialogModel } from "./models-dialog.js";

interface DeferredModelsDialogPort extends OwnedUiShellComponentPort {
  readonly ready: Promise<void>;
  updateModels(models: readonly ModelsDialogModel[]): void;
  setRefreshStatus(message: string, kind: "muted" | "success" | "warning"): void;
  dirty(): boolean;
}

/** Captures input immediately while keeping the optional Models controller outside the startup graph. */
export function createDeferredModelsDialog(options: ModelsDialogConfig & ModelsDialogCallbacks): DeferredModelsDialogPort {
  let dialog: ModelsDialogComponent | undefined;
  let closed = false;
  let focused = false;
  let models = options.models;
  let status: readonly [string, "muted" | "success" | "warning"] | undefined;
  let loading = "Loading Models…";
  const pending: string[] = [];
  const ready = import("./models-dialog.js").then(({ ModelsDialogComponent }) => {
    if (closed) return;
    dialog = new ModelsDialogComponent({ ...options, models }, options);
    dialog.focused = focused;
    if (status !== undefined) dialog.setRefreshStatus(...status);
    for (const data of pending.splice(0)) { if (!closed) dialog.handleInput(data); }
    options.requestRender();
  }).catch(() => { if (!closed) { loading = "Models unavailable — Esc close"; options.requestRender(); } });
  return {
    ready,
    render: width => dialog?.render(width) ?? [loading.slice(0, width)],
    handleInput: data => {
      if (dialog !== undefined) dialog.handleInput(data);
      else if (data === "\u001b" || data === "\u0003") options.onCancel();
      else if (pending.length < 32) pending.push(data);
    },
    invalidate: () => dialog?.invalidate(),
    setFocused: value => { focused = value; if (dialog !== undefined) dialog.focused = value; },
    dispose: () => { closed = true; pending.length = 0; dialog?.dispose(); },
    updateModels: next => { models = next; dialog?.updateModels(next); },
    setRefreshStatus: (message, kind) => { status = [message, kind]; dialog?.setRefreshStatus(message, kind); },
    dirty: () => dialog?.dirty ?? false,
  };
}
