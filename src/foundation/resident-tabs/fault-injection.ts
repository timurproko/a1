const CRASH_POINT = "A1_TABS_FAULT_CRASH_POINT";
const HERMETIC = "A1_TABS_HERMETIC_TEST";

export const RESIDENT_TAB_FAULT_ENVIRONMENT = Object.freeze([CRASH_POINT, HERMETIC] as const);

/** Test-only crash points are inert unless the caller explicitly marks a hermetic process. */
export class ResidentTabFaultInjection {
  readonly #point: string | undefined;
  readonly #crash: (point: string) => never;

  constructor(environment: NodeJS.ProcessEnv = process.env, crash: (point: string) => never = point => {
    process.stderr.write(`resident tab injected crash: ${point}\n`);
    process.abort();
  }) {
    const point = environment[CRASH_POINT];
    if (point !== undefined && environment[HERMETIC] !== "1") {
      throw new Error(`${CRASH_POINT} is available only in a hermetic resident-tab test`);
    }
    this.#point = point;
    this.#crash = crash;
  }

  at(point: string): void {
    if (this.#point === point) this.#crash(point);
  }
}
