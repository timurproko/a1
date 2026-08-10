import Headless from "@xterm/headless";
const { Terminal } = Headless;
import * as pty from "node-pty";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";
import type { ScenarioContext } from "./context.js";

export interface NormalizedFrame {
  readonly name: string;
  readonly capturedAtMs: number;
  readonly columns: number;
  readonly rows: number;
  readonly lines: readonly string[];
  readonly cursor: { readonly column: number; readonly row: number };
}
export interface TimelineEntry { readonly atMs: number; readonly type: "keyboard" | "mouse" | "resize" | "launch" | "stop"; readonly detail: unknown }

export class OuterPtyRunner {
  readonly frames: NormalizedFrame[] = [];
  readonly timeline: TimelineEntry[] = [];
  #terminal: InstanceType<typeof Terminal>;
  #child: pty.IPty | null = null;
  #startedAt = 0;
  #rawLog = "";
  #exit: Promise<{ exitCode: number; signal?: number }> | null = null;
  #exited = false;

  constructor(readonly context: ScenarioContext, columns = 90, rows = 28) {
    this.#terminal = new Terminal({ cols: columns, rows, scrollback: 1_000, allowProposedApi: true });
    writeFileSync(context.terminalSizePath, JSON.stringify({ columns, rows }));
  }

  get rawLog(): string { return this.#rawLog; }

  launch(command: string, args: readonly string[], cwd = this.context.workspace): void {
    if (this.#child) throw new Error("outer PTY is already running");
    this.#startedAt = performance.now();
    this.timeline.push({ atMs: 0, type: "launch", detail: { command, args, cwd } });
    const environment: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.context.environment)) if (value !== undefined) environment[key] = value;
    const child = pty.spawn(command, [...args], {
      name: "xterm-256color",
      cols: this.#terminal.cols,
      rows: this.#terminal.rows,
      cwd,
      env: environment,
    });
    this.#child = child;
    child.onData(data => {
      this.#rawLog += data;
      this.#terminal.write(data);
    });
    this.#exit = new Promise(resolve => child.onExit(event => {
      this.#exited = true;
      resolve(event);
    }));
  }

  keyboard(data: string): void {
    this.#requireChild().write(data);
    this.timeline.push({ atMs: this.#elapsed(), type: "keyboard", detail: JSON.stringify(data) });
  }

  mouse(column: number, row: number): void {
    const data = `\x1b[<0;${column};${row}M`;
    this.#requireChild().write(data);
    this.timeline.push({ atMs: this.#elapsed(), type: "mouse", detail: { column, row, data } });
  }

  resize(columns: number, rows: number): void {
    writeFileSync(this.context.terminalSizePath, JSON.stringify({ columns, rows }));
    this.#terminal.resize(columns, rows);
    this.#requireChild().resize(columns, rows);
    this.timeline.push({ atMs: this.#elapsed(), type: "resize", detail: { columns, rows } });
  }

  capture(name: string): NormalizedFrame {
    const buffer = this.#terminal.buffer.active;
    const lines = Array.from({ length: this.#terminal.rows }, (_, row) => buffer.getLine(buffer.viewportY + row)?.translateToString(true) ?? "");
    const frame = {
      name,
      capturedAtMs: this.#elapsed(),
      columns: this.#terminal.cols,
      rows: this.#terminal.rows,
      lines,
      cursor: { column: buffer.cursorX, row: buffer.cursorY },
    };
    this.frames.push(frame);
    return frame;
  }

  async waitFor(text: string, deadlineMs: number, frameName?: string): Promise<NormalizedFrame> {
    const deadline = performance.now() + deadlineMs;
    while (performance.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25));
      const frame = this.capture(frameName ?? `wait-${this.frames.length}`);
      if (frame.lines.join("\n").includes(text)) return frame;
      this.frames.pop();
    }
    const final = this.capture(frameName ?? "deadline-final");
    throw new Error(`terminal condition ${JSON.stringify(text)} not reached after ${deadlineMs}ms\n${final.lines.join("\n")}`);
  }

  async stopUi(): Promise<void> {
    if (!this.#child) return;
    this.timeline.push({ atMs: this.#elapsed(), type: "stop", detail: "Ctrl+C UI only" });
    this.#child.write("\x03");
    await Promise.race([this.#exit, new Promise(resolve => setTimeout(resolve, 2_000))]);
    if (!this.#exited) killTree(this.#child.pid);
    this.#child = null;
    this.#exited = false;
  }

  async cleanup(): Promise<void> {
    await this.stopUi();
    const metadata = JSON.parse(await readFile(join(this.context.runtimeDir, "supervisor.json"), "utf8").catch(() => "null")) as { pid?: number } | null;
    if (metadata?.pid) killTree(metadata.pid);
  }

  #requireChild(): pty.IPty {
    if (!this.#child) throw new Error("outer PTY is not running");
    return this.#child;
  }
  #elapsed(): number { return Math.round(performance.now() - this.#startedAt); }
}

function killTree(pid: number): void {
  if (platform() === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
  else {
    try { process.kill(-pid, "SIGTERM"); } catch { try { process.kill(pid, "SIGTERM"); } catch {} }
  }
}
