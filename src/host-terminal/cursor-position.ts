export interface CursorPositionInput {
  readonly isTTY?: boolean;
  readonly isRaw?: boolean;
  setRawMode?(enabled: boolean): void;
  on?(event: "data", listener: (data: Buffer | string) => void): unknown;
  off?(event: "data", listener: (data: Buffer | string) => void): unknown;
  resume?(): unknown;
}

export interface CursorPositionOutput { write(data: string): unknown }
export interface HostCursorPosition { readonly column: number; readonly row: number }

export function queryHostCursorPosition(
  input: CursorPositionInput,
  output: CursorPositionOutput,
  deadlineMs = 100,
): Promise<HostCursorPosition | null> {
  if (!input.isTTY || !input.on || !input.off) return Promise.resolve(null);
  return new Promise(resolve => {
    const restoreRaw = input.isRaw !== true && input.setRawMode ? () => input.setRawMode?.(false) : () => {};
    if (input.isRaw !== true) input.setRawMode?.(true);
    let pending = "";
    let settled = false;
    const finish = (position: HostCursorPosition | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      input.off?.("data", onData);
      restoreRaw();
      resolve(position);
    };
    const onData = (data: Buffer | string) => {
      pending = `${pending}${typeof data === "string" ? data : data.toString("utf8")}`.slice(-64);
      const match = /\x1b\[(\d+);(\d+)R/.exec(pending);
      if (match) finish({ row: Math.max(0, Number(match[1]) - 1), column: Math.max(0, Number(match[2]) - 1) });
    };
    const timer = setTimeout(() => finish(null), deadlineMs);
    input.on?.("data", onData);
    input.resume?.();
    output.write("\x1b[6n");
  });
}
