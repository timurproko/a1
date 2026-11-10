import type { PiShellSkillsSelectorOptions } from "./skills-dialog.js";
import type { OwnedUiShellComponentPort } from "../../../contracts/owned-ui/index.js";

/** Defers optional selector code while retaining focus, early input and cancellation. */
export function deferredSelector(load: () => Promise<OwnedUiShellComponentPort>, cancel: () => void): OwnedUiShellComponentPort {
  let delegate: OwnedUiShellComponentPort | undefined;
  let closed = false;
  let focused = false;
  let failure: string | undefined;
  const pending: string[] = [];
  const ready = load().then(component => {
    if (closed) { component.dispose?.(); return; }
    delegate = component;
    delegate.setFocused?.(focused);
    for (const key of pending.splice(0)) { if (!closed) delegate.handleInput?.(key); }
  }).catch(() => { if (!closed) failure = "Selector unavailable — Esc close"; });
  return {
    ready,
    render: width => delegate?.render(width) ?? (failure === undefined ? [] : [failure.slice(0, width)]),
    invalidate: () => delegate?.invalidate(),
    handleInput: data => {
      if (delegate !== undefined) delegate.handleInput?.(data);
      else if (data === "\u001b" || data === "\u0003") cancel();
      else if (pending.length < 32) pending.push(data);
    },
    setFocused: value => { focused = value; delegate?.setFocused?.(value); },
    dispose: () => { closed = true; pending.length = 0; delegate?.dispose?.(); },
  };
}

/** Keeps Skills outside first-prompt loading. */
export function createPiShellSkillsSelector(options: PiShellSkillsSelectorOptions): OwnedUiShellComponentPort {
  return deferredSelector(() => import("./skills-dialog.js").then(module => module.createPiShellSkillsSelector(options)), options.onCancel);
}
