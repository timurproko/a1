import type { OwnedUiShellLoginDialogPort as Login } from "../../../contracts/owned-ui/index.js";

/** Queues optional login calls. */
export function deferredLoginDialog(...args: Parameters<typeof import("./upstream/components/login-dialog.js").createThemedLoginDialog>): Login {
  const [runtime, , complete] = args;
  let dialog: Login | undefined, closed = false, focused = false, failed = false;
  const pending: Array<(target: Login) => void> = [];
  const rejects = new Set<(error: Error) => void>();
  const rejectAll = (message: string) => { for (const reject of rejects) reject(new Error(message)); rejects.clear(); pending.length = 0; };
  const ready = import("./upstream/components/login-dialog.js").then(module => {
    if (closed) return;
    dialog = module.createThemedLoginDialog(...args);
    dialog.setFocused?.(focused);
    for (const action of pending.splice(0)) { if (!closed) action(dialog); }
  }).catch(() => { failed = true; rejectAll("Login unavailable"); }).finally(() => { if (!closed) runtime.requestRender(); });
  const call = (action: (target: Login) => void) => { if (!closed && !failed) { if (dialog) action(dialog); else pending.push(action); } };
  const dispose = () => { closed = true; dialog?.dispose?.(); rejectAll("Login cancelled"); };
  const answer = (action: (target: Login) => Promise<string>): Promise<string> => new Promise((resolve, reject) => {
    if (closed || failed) { reject(new Error("Login unavailable")); return; }
    rejects.add(reject);
    call(target => { rejects.delete(reject); void action(target).then(resolve, reject); });
  });
  return {
    ready, dispose,
    render: width => dialog?.render(width) ?? (failed ? ["Login unavailable — Esc close".slice(0, width)] : []),
    invalidate: () => dialog?.invalidate(),
    setFocused: value => { focused = value; dialog?.setFocused?.(value); },
    handleInput: data => {
      if (!dialog && (data === "\u001b" || data === "\u0003")) { dispose(); complete(false, "Login cancelled"); }
      else call(target => target.handleInput?.(data));
    },
    showAuth: (url, instructions) => call(target => target.showAuth(url, instructions)),
    showDeviceCode: info => call(target => target.showDeviceCode(info)),
    showManualInput: message => answer(target => target.showManualInput(message)),
    showPrompt: (message, placeholder) => answer(target => target.showPrompt(message, placeholder)),
    showDetails: lines => call(target => target.showDetails(lines)),
    showInfo: (message, links) => call(target => target.showInfo(message, links)),
    showWaiting: message => call(target => target.showWaiting(message)),
    showProgress: message => call(target => target.showProgress(message)),
  };
}
