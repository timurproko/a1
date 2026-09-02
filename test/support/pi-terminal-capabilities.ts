import {
  getCapabilities,
  setCapabilities,
  type TerminalCapabilities,
} from "#pi-tui";

/** Color depths declared by parity workloads instead of inferred from their host process. */
export type PiParityColorMode = "truecolor" | "256color";

/** Both supported color modes, ordered from lossless RGB to quantized palette output. */
export const PI_PARITY_COLOR_MODES: readonly PiParityColorMode[] = ["truecolor", "256color"];

/** Returns whether Pi-TUI must expose truecolor for the declared parity mode. */
export function parityModeUsesTrueColor(mode: PiParityColorMode): boolean {
  return mode === "truecolor";
}

type PiParityCapabilityOverrides = Partial<Omit<TerminalCapabilities, "trueColor">>;

export function withPiParityColorMode<T>(
  mode: PiParityColorMode,
  run: () => Promise<T>,
  overrides?: PiParityCapabilityOverrides,
): Promise<T>;
export function withPiParityColorMode<T>(
  mode: PiParityColorMode,
  run: () => T,
  overrides?: PiParityCapabilityOverrides,
): T;
/**
 * Runs one non-concurrent parity capture with declared Pi-TUI capabilities.
 * The complete prior capability object is restored for sync, async, nested, and failing captures.
 */
export function withPiParityColorMode<T>(
  mode: PiParityColorMode,
  run: () => T | Promise<T>,
  overrides: PiParityCapabilityOverrides = {},
): T | Promise<T> {
  const previous: TerminalCapabilities = getCapabilities();
  setCapabilities({ ...previous, ...overrides, trueColor: parityModeUsesTrueColor(mode) });
  try {
    const result = run();
    if (isPromiseLike<T>(result)) {
      return Promise.resolve(result).finally(() => setCapabilities(previous));
    }
    setCapabilities(previous);
    return result;
  } catch (error) {
    setCapabilities(previous);
    throw error;
  }
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}
