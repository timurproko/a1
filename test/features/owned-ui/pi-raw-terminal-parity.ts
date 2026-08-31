export type TerminalFrameProducer = "pinned-pi-0.84.2" | "owned-product" | "owned-diagnostic";

export interface RawTerminalFrame {
  readonly producer: TerminalFrameProducer;
  readonly surface: string;
  readonly width: number;
  readonly rows: readonly string[];
  readonly controls?: readonly string[];
}

export interface TerminalParitySubstitutions {
  readonly productCommand?: readonly [pinned: string, owned: string];
  readonly absolutePaths?: readonly [pinned: string, owned: string][];
}

/**
 * The narrow normalization allowed by the visual-parity contract. It retains
 * every CSI/SGR sequence and OSC boundary while replacing only declared data.
 */
export function normalizeRawTerminalFrame(
  frame: RawTerminalFrame,
  substitutions: TerminalParitySubstitutions = {},
): RawTerminalFrame {
  const replace = (input: string): string => {
    let value = input
      .replaceAll("\u001b[?2026h", "")
      .replaceAll("\u001b[?2026l", "")
      .replace(/\u001b]8;;([^\u0007\u001b]*)(\u0007|\u001b\\)/g, (_match, target: string, close: string) =>
        `\u001b]8;;${normalizeLinkTarget(target)}${close}`);
    const command = substitutions.productCommand;
    if (command !== undefined) value = value.replaceAll(command[1], command[0]);
    for (const [pinned, owned] of substitutions.absolutePaths ?? []) value = value.replaceAll(owned, pinned);
    return value;
  };
  return {
    ...frame,
    rows: frame.rows.map(replace),
    ...(frame.controls === undefined ? {} : { controls: frame.controls.map(replace) }),
  };
}

export function assertIndependentRawTerminalParity(
  pinned: RawTerminalFrame,
  owned: RawTerminalFrame,
  substitutions: TerminalParitySubstitutions = {},
): void {
  if (pinned.producer !== "pinned-pi-0.84.2") {
    throw new Error(`visual authority must be independently produced by pinned Pi 0.84.2, not ${pinned.producer}`);
  }
  if (owned.producer !== "owned-product") throw new Error(`actual visual frame must be produced by the owned product, not ${owned.producer}`);
  const normalizedPinned = normalizeRawTerminalFrame(pinned, substitutions);
  const normalizedOwned = normalizeRawTerminalFrame(owned, substitutions);
  if (normalizedPinned.surface !== normalizedOwned.surface) throw new Error("visual surfaces differ");
  if (normalizedPinned.width !== normalizedOwned.width) throw new Error("visual widths differ");
  if (!same(normalizedPinned.rows, normalizedOwned.rows)) throw new Error("terminal rows differ in text, geometry, or semantic ANSI");
  if (!same(normalizedPinned.controls ?? [], normalizedOwned.controls ?? [])) throw new Error("terminal control ordering differs");
}

function normalizeLinkTarget(target: string): string {
  if (target.length === 0) return "";
  const suffix = target.replaceAll("\\", "/").split("/").at(-1) ?? "target";
  return `<absolute-link-target>/${suffix}`;
}

function same(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
