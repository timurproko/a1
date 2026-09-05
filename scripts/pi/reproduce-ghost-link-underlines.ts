import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, mkdtempSync, openSync, writeSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DamageAwareTerminalAdapter } from "../../src/integrations/pi/tui-runtime/damage-aware-terminal.js";
import type { PiTuiTerminalPort } from "../../src/integrations/pi/tui-runtime/contracts.js";
import { routeMouseInput } from "../../src/ui/components/mouse.js";
import {
  ghostLinkDocument,
  ghostLinkScreen,
  ghostLinkWrite,
  type GhostLinkFixtureMode,
} from "../../test/support/rendering/ghost-link-fixture.js";

const ENTER = "\u001b[?1049h\u001b[?7l\u001b[?1000h\u001b[?1006h\u001b[?25l";
const LEAVE = "\u001b]8;;\u001b\\\u001b[0m\u001b[?1006l\u001b[?1000l\u001b[?7h\u001b[?1049l\u001b[?25h";

/** Standalone protocol probe, not the A1/Pi UI: record the exact bytes sent to the host. */
class ProbeTerminal implements PiTuiTerminalPort {
  readonly kittyProtocolActive = false;
  constructor(
    readonly interactive: boolean,
    readonly record: (value: object) => void,
  ) {}
  get columns(): number { return this.interactive ? Math.max(1, process.stdout.columns) : 192; }
  get rows(): number { return this.interactive ? Math.max(3, process.stdout.rows) : 54; }
  start(): void {}
  stop(): void {}
  async drainInput(): Promise<void> {}
  write(data: string): void {
    this.record({ type: "terminal-write", data });
    if (this.interactive) process.stdout.write(data);
  }
  moveBy(lines: number): void { this.write(`\u001b[${Math.abs(lines)}${lines < 0 ? "A" : "B"}`); }
  hideCursor(): void { this.write("\u001b[?25l"); }
  showCursor(): void { this.write("\u001b[?25h"); }
  clearLine(): void { this.write("\u001b[K"); }
  clearFromCursor(): void { this.write("\u001b[J"); }
  clearScreen(): void { this.write("\u001b[2J\u001b[H"); }
  setTitle(): void {}
  setProgress(): void {}
}

/** Captures fixture state and adapter decisions; human observations remain explicitly separate. */
async function main(): Promise<void> {
  const interactive = !process.argv.includes("--capture");
  if (interactive && (!process.stdin.isTTY || !process.stdout.isTTY)) {
    throw new Error("A terminal is required. Use --capture for byte evidence without physical observations.");
  }
  const artifactRoot = resolve(".artifacts/ghost-link-baseline");
  mkdirSync(artifactRoot, { recursive: true });
  const trace = join(mkdtempSync(join(artifactRoot, "run-")), "trace.jsonl");
  const fd = openSync(trace, "wx");
  const start = performance.now();
  const record = (value: object) => writeSync(fd, `${JSON.stringify({ atMs: performance.now() - start, ...value })}\n`);
  const terminal = new ProbeTerminal(interactive, record);
  const adapter = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true });
  let mode: GhostLinkFixtureMode = process.argv.includes("--auto") ? "auto-detected" : "explicit";
  let preserveClears = process.argv.includes("--preserve-clears");
  let blank = false;
  let short = false;
  let scrollTop = 0;
  let frameId = 0;
  let previousAction = "initial";
  let previousBypass = false;
  let finish = () => {};
  const fileTarget = pathToFileURL(resolve("package.json")).href;
  const render = (action: string, bypass = preserveClears) => {
    const width = terminal.columns;
    const height = terminal.rows;
    const document = ghostLinkDocument(width, mode, fileTarget, short);
    scrollTop = Math.max(0, Math.min(scrollTop, Math.max(0, document.length - (height - 2))));
    const status = `${mode} | CLEAR:${preserveClears ? "ON" : "OFF"} (p toggles) | ${blank ? "blank" : short ? "short" : "original"} | scroll ${scrollTop} | ${action}`;
    const rows = ghostLinkScreen(document, width, height, scrollTop, blank, status);
    const input = ghostLinkWrite(rows, true);
    record({ type: "frame-request", frameId: ++frameId, mode, preserveClears, blank, short, scrollTop, width, height, action, bypass, data: input });
    if (bypass) {
      // Protocol: restart the adapter cache after a direct host clear. The
      // bypass is labelled and must never be mistaken for production behavior.
      adapter.stop();
      terminal.write(input);
    } else {
      adapter.arm({
        frameId, width, height,
        transcript: { rowStart: 1, rowEnd: height - 2 },
        dock: { rowStart: height - 1, rowEnd: height },
        verticalShiftRows: 0, safeVerticalShift: false, cause: "ghost-link-baseline",
      }, { overlayActive: false, selectionActive: false, replacementSurfaceActive: false });
      adapter.write(input);
      record({ type: "damage-decision", ...adapter.lastDecision });
    }
    previousAction = action;
    previousBypass = bypass;
  };
  const key = (data: string) => {
    if (data === "q" || data === "\u0003") { finish(); return; }
    if (data === "y" || data === "n") {
      record({ type: "human-observation", mode, preserveClears, bypass: previousBypass, blank, short, scrollTop, action: previousAction, ghost: data === "y" });
      render(data === "y" ? "recorded GHOST" : "recorded CLEAN");
      return;
    }
    if (data === "1" || data === "2" || data === "r") {
      if (data !== "r") mode = data === "1" ? "explicit" : "auto-detected";
      blank = false; short = false; scrollTop = 0;
    } else if (data === "p") preserveClears = !preserveClears;
    else if (data === "x") blank = true;
    else if (data === "b") { short = !short; blank = false; }
    else if (data === "j" || data === "\u001b[B") scrollTop += 3;
    else if (data === "k" || data === "\u001b[A") scrollTop -= 3;
    else if (data !== "f") return;
    render(data, data === "f" || preserveClears);
  };
  const input = (data: string) => {
    record({ type: "input", data });
    const routed = routeMouseInput(data, event => {
      if (event.kind === "wheel-up") key("k");
      else if (event.kind === "wheel-down") key("j");
      return true;
    });
    // Security: interpret complete commands only; never execute arbitrary terminal input.
    key(routed.data);
  };
  const resized = () => render("resize");
  const interrupted = () => { record({ type: "interrupted" }); finish(); };
  const wasRaw = process.stdin.isRaw;
  let entered = false;
  try {
    record({
      type: "metadata", formatVersion: 2, interactive, mode, preserveClears,
      commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      dirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
      terminalVersion: option("--terminal-version") ?? "unknown",
      urlDetection: option("--url-detection") ?? "unknown",
      terminalProgram: process.env.TERM_PROGRAM ?? null,
      windowsTerminalSession: process.env.WT_SESSION ?? null,
      columns: terminal.columns, rows: terminal.rows,
      limitation: "Protocol fixture only; no full shell, native-hover inspection, or automated visual verdict.",
    });
    if (interactive) {
      entered = true;
      terminal.write(ENTER);
      process.stdin.setRawMode(true);
      process.stdin.setEncoding("utf8");
      const done = new Promise<void>(resolveDone => { finish = resolveDone; });
      process.stdin.on("data", input);
      process.stdout.on("resize", resized);
      process.on("SIGTERM", interrupted);
      process.stdin.on("end", interrupted);
      process.stdin.resume();
      render("initial");
      await done;
    } else {
      render("initial");
      // Protocol: compare persistent clear states with actual wheel reports,
      // not a one-shot clear after the transient hover artifact already faded.
      for (const command of ["b", "x", "f", "2", "j", "x", "p", "r", "\u001b[<65;8;3M", "\u001b[<64;8;3M", "p", "j"]) input(command);
      record({ type: "physical-result", result: "not-observed" });
    }
  } finally {
    process.stdin.off("data", input);
    process.stdin.off("end", interrupted);
    process.stdout.off("resize", resized);
    process.off("SIGTERM", interrupted);
    if (entered) {
      process.stdin.setRawMode(wasRaw ?? false);
      process.stdin.pause();
      terminal.write(LEAVE);
    }
    adapter.stop();
    closeSync(fd);
  }
  process.stdout.write(`Trace saved: ${trace}\nPhysical observations are required; captured bytes alone do not prove the visual fix.\n`);
}

/** Optional host facts are provided explicitly, never guessed from a screenshot. */
function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

await main();
