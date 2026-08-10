import Headless from "@xterm/headless";
const { Terminal } = Headless;
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, extname, isAbsolute, join } from "node:path";
import { platform } from "node:os";
import * as pty from "node-pty";
import type {
  AgentId,
  GenerationId,
  NativePiProfile,
  TerminalDimensions,
  TerminalDriver,
  TerminalDriverEvent,
  TerminalDriverHandle,
  TerminalSurface,
} from "../../domain/index.js";
import { assertDimensions } from "../../domain/index.js";

const MAX_SCROLLBACK_LINES = 500;

export class NativePiTerminalDriver implements TerminalDriver {
  async start(
    agentId: AgentId,
    generationId: GenerationId,
    profile: NativePiProfile,
    emit: (event: TerminalDriverEvent) => void,
  ): Promise<TerminalDriverHandle> {
    assertDimensions(profile.dimensions);
    const terminal = new Terminal({
      cols: profile.dimensions.columns,
      rows: profile.dimensions.rows,
      scrollback: MAX_SCROLLBACK_LINES,
      allowProposedApi: true,
    });
    const environment: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) if (value !== undefined) environment[key] = value;
    Object.assign(environment, profile.environment, { TERM: profile.terminalType });

    let child: pty.IPty;
    try {
      const resolved = resolveExecutable(profile.executable, environment);
      const commandScript = platform() === "win32" && [".cmd", ".bat"].includes(extname(resolved).toLowerCase());
      const executable = commandScript ? (environment.ComSpec ?? "cmd.exe") : resolved;
      const spawnArguments = commandScript ? ["/d", "/s", "/c", resolved, ...profile.arguments] : [...profile.arguments];
      child = pty.spawn(executable, spawnArguments, {
        name: profile.terminalType,
        cols: profile.dimensions.columns,
        rows: profile.dimensions.rows,
        cwd: profile.cwd,
        env: environment,
        useConpty: platform() === "win32",
      });
    } catch (error) {
      throw new Error(`failed to start Native Pi from PATH: ${error instanceof Error ? error.message : String(error)}`);
    }

    let revision = 0;
    let lastSurface: TerminalSurface | null = null;
    let exited = false;
    const capture = (final = false): TerminalSurface => {
      const buffer = terminal.buffer.active;
      const rows = Array.from({ length: terminal.rows }, (_, rowIndex) => {
        const line = buffer.getLine(buffer.viewportY + rowIndex);
        return Array.from({ length: terminal.cols }, (_, columnIndex) => {
          const cell = line?.getCell(columnIndex);
          if (!cell) return { character: " ", width: 1, attributes: 0 };
          const attributes =
            (cell.isBold() ? 1 : 0)
            | (cell.isItalic() ? 2 : 0)
            | (cell.isUnderline() ? 4 : 0)
            | (cell.isInverse() ? 8 : 0)
            | (cell.isDim() ? 16 : 0);
          const foreground = cell.isFgDefault() ? undefined : cell.getFgColor();
          const background = cell.isBgDefault() ? undefined : cell.getBgColor();
          return {
            character: cell.getChars() || " ",
            width: cell.getWidth(),
            ...(foreground === undefined ? {} : { foreground }),
            ...(background === undefined ? {} : { background }),
            attributes,
          };
        });
      });
      lastSurface = {
        columns: terminal.cols,
        rows: terminal.rows,
        cells: rows,
        cursor: { column: buffer.cursorX, row: buffer.cursorY, visible: true },
        revision: ++revision,
        final,
      };
      return lastSurface;
    };

    child.onData(data => {
      terminal.write(data, () => emit({ type: "surface", agentId, generationId, surface: capture(false) }));
    });
    child.onExit(({ exitCode, signal }) => {
      exited = true;
      queueMicrotask(() => {
        const surface = capture(true);
        emit({ type: "surface", agentId, generationId, surface });
        emit({ type: "exit", agentId, generationId, exitCode, signal: signal ?? null, surface });
      });
    });

    return {
      agentId,
      generationId,
      input(data: string): void {
        if (!exited) child.write(data);
      },
      resize(dimensions: TerminalDimensions): void {
        assertDimensions(dimensions);
        if (exited) return;
        terminal.resize(dimensions.columns, dimensions.rows);
        child.resize(dimensions.columns, dimensions.rows);
        emit({ type: "surface", agentId, generationId, surface: capture(false) });
      },
      async stop(): Promise<void> {
        if (exited) return;
        if (platform() === "win32") {
          spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
        } else {
          child.kill();
        }
        await new Promise<void>(resolve => {
          const deadline = setTimeout(resolve, 2_000);
          child.onExit(() => {
            clearTimeout(deadline);
            resolve();
          });
        });
      },
      snapshot(): TerminalSurface | null {
        return lastSurface;
      },
    };
  }
}

function resolveExecutable(executable: string, environment: Readonly<Record<string, string>>): string {
  if (isAbsolute(executable)) {
    if (!existsSync(executable)) throw new Error(`executable not found: ${executable}`);
    return executable;
  }
  const extensions = platform() === "win32"
    ? (environment.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")
    : [""];
  for (const directory of (environment.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const extension of extensions) {
      const candidate = join(directory, platform() === "win32" ? `${executable}${extension.toLowerCase()}` : executable);
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error(`executable '${executable}' was not found on PATH`);
}
