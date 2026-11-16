import type { PiShellSkillsSelectorOptions } from "./skills-dialog.js";
import type { OwnedUiShellComponentPort } from "../../../contracts/owned-ui/index.js";

/** Defers optional selector code while retaining focus, early input and cancellation. */
export function deferredSelector(load: () => Promise<OwnedUiShellComponentPort>, cancel: () => void,
  options: { readonly placeholder?: OwnedUiShellComponentPort; readonly deferInterrupt?: boolean } = {},
): OwnedUiShellComponentPort {
  let delegate: OwnedUiShellComponentPort | undefined;
  let closed = false;
  let focused = false;
  let failure: string | undefined;
  let lastWidth: number | undefined;
  const pending: Array<string | Parameters<NonNullable<OwnedUiShellComponentPort["handleLocalMouse"]>>[0]> = [];
  const ready = load().then(component => {
    if (closed) { component.dispose?.(); return; }
    delegate = component;
    delegate.setFocused?.(focused);
    if (lastWidth !== undefined) delegate.render(lastWidth);
    for (const input of pending.splice(0)) {
      if (!closed) {
        if (typeof input === "string") delegate.handleInput?.(input);
        else delegate.handleLocalMouse?.(input);
      }
    }
  }).catch(() => { if (!closed) failure = "Selector unavailable — Esc close"; });
  return {
    ready,
    render: width => {
      lastWidth = width;
      return delegate?.render(width) ?? (failure === undefined ? options.placeholder?.render(width) ?? [] : [failure.slice(0, width)]);
    },
    invalidate: () => delegate?.invalidate(),
    handleInput: data => {
      if (delegate !== undefined) delegate.handleInput?.(data);
      else if (data === "\u001b" || data === "\u0003" && !options.deferInterrupt) cancel();
      else if (pending.length < 32) pending.push(data);
    },
    handleLocalMouse: event => {
      if (delegate !== undefined) delegate.handleLocalMouse?.(event);
      else if (pending.length < 32) pending.push(event);
    },
    setFocused: value => { focused = value; delegate?.setFocused?.(value); options.placeholder?.setFocused?.(value); },
    dispose: () => { closed = true; pending.length = 0; delegate?.dispose?.(); options.placeholder?.dispose?.(); },
  };
}

/** Keeps Skills outside first-prompt loading. */
export function createPiShellSkillsSelector(options: PiShellSkillsSelectorOptions): OwnedUiShellComponentPort {
  return deferredSelector(() => import("./skills-dialog.js").then(module => module.createPiShellSkillsSelector(options)), options.onCancel);
}
