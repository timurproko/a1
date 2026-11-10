import type { PiShellSkillsSelectorOptions } from "./skills-dialog.js";
import type { OwnedUiShellComponentPort } from "../../../contracts/owned-ui/index.js";

/** Keeps the optional Skills controller outside first-prompt loading while retaining early input. */
export function createPiShellSkillsSelector(options: PiShellSkillsSelectorOptions): OwnedUiShellComponentPort {
  let delegate: OwnedUiShellComponentPort | undefined;
  let closed = false;
  let focused = false;
  let failure: string | undefined;
  const pending: string[] = [];
  const ready = import("./skills-dialog.js").then(module => {
    if (closed) return;
    delegate = module.createPiShellSkillsSelector(options);
    delegate.setFocused?.(focused);
    for (const key of pending.splice(0)) { if (!closed) delegate.handleInput?.(key); }
  }).catch(() => { if (!closed) failure = "Skills unavailable — Esc close"; });
  return {
    ready,
    render: width => delegate?.render(width) ?? (failure === undefined ? [] : [failure.slice(0, width)]),
    invalidate: () => delegate?.invalidate(),
    handleInput: data => {
      if (delegate !== undefined) delegate.handleInput?.(data);
      else if (data === "\u001b" || data === "\u0003") options.onCancel();
      else if (pending.length < 32) pending.push(data);
    },
    setFocused: value => { focused = value; delegate?.setFocused?.(value); },
    dispose: () => { closed = true; pending.length = 0; delegate?.dispose?.(); },
  };
}
