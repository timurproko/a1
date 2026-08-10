export interface MonotonicClock { now(): number }
export interface StartupState { readonly phase: "intro" | "shell"; readonly startedAt: number; readonly elapsedMs: number }

export const INTRO_DURATION_MS = 3_000;
export const INTRO_TICK_MS = 33;
export const INTRO_LOGO = ["▀██████████▀", " ╘██    ██  ", "  ██    ██  ", "  ██    ██  ", " ▄██▄  ▄██▄ "] as const;
const STOPS = [[255, 92, 200], [200, 110, 255], [120, 130, 255], [60, 200, 255], [120, 255, 220]] as const;

export function initialStartupState(clock: MonotonicClock): StartupState {
  return { phase: "intro", startedAt: clock.now(), elapsedMs: 0 };
}

export function updateStartupState(state: StartupState, clock: MonotonicClock, durationMs = INTRO_DURATION_MS): StartupState {
  if (state.phase === "shell") return state;
  const elapsedMs = Math.max(0, clock.now() - state.startedAt);
  return elapsedMs >= durationMs
    ? { phase: "shell", startedAt: state.startedAt, elapsedMs: durationMs }
    : { ...state, elapsedMs };
}

export function renderIntro(state: StartupState, columns: number, rows: number): string[] {
  const progress = Math.min(0.999999, state.elapsedMs / INTRO_DURATION_MS);
  const eased = 1 - (1 - progress) ** 3;
  const phase = mod((1 - eased) * 2.5, 1);
  const shinePosition = mod(progress * 3, 1);
  const shineStrength = (1 - eased) ** 1.5;
  const logo = gradientLogo(INTRO_LOGO, phase, shinePosition, shineStrength);
  const title = "ADDONE";
  const top = Math.max(0, Math.floor((rows - logo.length - 2) / 2));
  const lines = Array.from({ length: rows }, () => "");
  for (let index = 0; index < logo.length; index++) lines[top + index] = center(logo[index] ?? "", columns, INTRO_LOGO[index]?.length ?? 0);
  lines[top + logo.length + 1] = center(`\x1b[1m${title}\x1b[0m`, columns, title.length);
  return lines;
}

function gradientLogo(lines: readonly string[], phase: number, shinePosition: number, shineStrength: number): string[] {
  const span = 16;
  return lines.map((line, row) => [...line].map((character, column) => {
    if (character === " ") return " ";
    const position = mod((column + (lines.length - 1 - row)) / span + phase, 1);
    const segment = position * (STOPS.length - 1);
    const index = Math.min(STOPS.length - 2, Math.floor(segment));
    const fraction = segment - index;
    const from = STOPS[index] ?? STOPS[0];
    const to = STOPS[index + 1] ?? STOPS[STOPS.length - 1];
    const shine = Math.max(0, 1 - Math.abs(position - shinePosition) / 0.18) * shineStrength;
    const color = from.map((value, channel) => {
      const mixed = value + ((to?.[channel] ?? value) - value) * fraction;
      return Math.round(mixed + (255 - mixed) * shine);
    });
    return `\x1b[38;2;${color[0]};${color[1]};${color[2]}m${character}\x1b[0m`;
  }).join(""));
}

function center(value: string, width: number, visible: number): string {
  return `${" ".repeat(Math.max(0, Math.floor((width - visible) / 2)))}${value}`;
}

function mod(value: number, divisor: number): number { return ((value % divisor) + divisor) % divisor; }
