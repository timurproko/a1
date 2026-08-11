import Headless from "@xterm/headless";
const { Terminal } = Headless;
import * as pty from "node-pty";
import { spawnSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";
import type { ScenarioContext } from "./context.js";

export interface NormalizedCell {
  readonly character: string;
  readonly width: number;
  readonly foreground: { readonly mode: "default" | "palette" | "rgb"; readonly value: number };
  readonly background: { readonly mode: "default" | "palette" | "rgb"; readonly value: number };
  readonly attributes: number;
}
export interface NormalizedFrame {
  readonly name: string;
  readonly capturedAtMs: number;
  readonly columns: number;
  readonly rows: number;
  readonly lines: readonly string[];
  readonly cells: readonly (readonly NormalizedCell[])[];
  readonly cursor: { readonly column: number; readonly row: number; readonly visible: boolean; readonly style: "default" | "block" | "underline" | "bar" };
  readonly activeScreen: "normal" | "alternate";
  readonly scrollbackLines: number;
  readonly viewportOffset: number;
  readonly modes: {
    readonly bracketedPaste: boolean;
    readonly focusReporting: boolean;
    readonly mouseTracking: string;
  };
}
export interface TimelineEntry { readonly atMs: number; readonly type: "keyboard" | "paste" | "focus" | "mouse" | "resize" | "launch" | "stop"; readonly detail: unknown }
export interface OuterOutputChunk { readonly atMs: number; readonly data: string }

export class OuterPtyRunner {
  readonly frames: NormalizedFrame[] = [];
  readonly timeline: TimelineEntry[] = [];
  readonly outputChunks: OuterOutputChunk[] = [];
  #terminal: InstanceType<typeof Terminal>;
  #child: pty.IPty | null = null;
  #startedAt = 0;
  #rawLog = "";
  #exit: Promise<{ exitCode: number; signal?: number }> | null = null;
  #exited = false;
  #cursorVisible = true;
  #cursorStyle: "default" | "block" | "underline" | "bar" = "default";
  #alternateScroll = false;
  #mouseProtocol: "x10" | "utf8" | "sgr" | "urxvt" = "x10";
  #win32InputMode = false;
  #conptyMouseFallback = false;
  #hostSelectionActive = false;
  #hostSelectionInitialRow = 0;
  #hostSelectionBaseY = 0;
  #modeTail = "";

  constructor(readonly context: ScenarioContext, columns = 90, rows = 28) {
    this.#terminal = new Terminal({ cols: columns, rows, scrollback: 1_000, allowProposedApi: true });
    writeFileSync(context.terminalSizePath, JSON.stringify({ columns, rows }));
  }

  get rawLog(): string { return this.#rawLog; }

  normalBufferText(): string {
    const buffer = this.#terminal.buffer.normal;
    return Array.from({ length: buffer.length }, (_, row) => buffer.getLine(row)?.translateToString(true) ?? "").join("\n");
  }

  launch(command: string, args: readonly string[], cwd = this.context.workspace): void {
    if (this.#child) throw new Error("outer PTY is already running");
    this.#startedAt = performance.now();
    this.timeline.push({ atMs: 0, type: "launch", detail: { command, args, cwd } });
    this.#conptyMouseFallback = args.some((argument, index) => argument === "--tui-mode" && args[index + 1] === "fullscreen");
    this.#hostSelectionActive = false;
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
      const atMs = this.#elapsed();
      this.outputChunks.push({ atMs, data });
      try {
        appendFileSync(this.context.terminalProtocolEvidence, `${JSON.stringify({
          at: new Date().toISOString(), atMs, pid: process.pid, role: "outer-pty", stage: "outer-frame",
          bytes: Buffer.byteLength(data, "utf8"), dataBase64: Buffer.from(data, "utf8").toString("base64"),
        })}\n`);
      } catch {}
      this.#rawLog += data;
      this.#modeTail = `${this.#modeTail}${data}`.slice(-256);
      for (const match of this.#modeTail.matchAll(/\x1b\[\?([0-9;]+)([hl])/g)) {
        const enabled = match[2] === "h";
        for (const value of (match[1] ?? "").split(";").map(Number)) {
          if (value === 25) this.#cursorVisible = enabled;
          if (value === 1007) this.#alternateScroll = enabled;
          if (value === 9001) {
            this.#win32InputMode = enabled;
            if (enabled && this.#conptyMouseFallback) this.#mouseProtocol = "sgr";
          }
          if (enabled && value === 1005) this.#mouseProtocol = "utf8";
          if (enabled && value === 1006) this.#mouseProtocol = "sgr";
          if (enabled && value === 1015) this.#mouseProtocol = "urxvt";
          if (!enabled && [1005, 1006, 1015].includes(value)) this.#mouseProtocol = "x10";
        }
      }
      for (const match of this.#modeTail.matchAll(/\x1b\[([0-6]?) q/g)) {
        const value = Number(match[1] || 0);
        this.#cursorStyle = value === 0 ? "default" : value >= 5 ? "bar" : value >= 3 ? "underline" : "block";
      }
      this.#terminal.write(data);
    });
    this.#exit = new Promise(resolve => child.onExit(event => {
      this.#exited = true;
      resolve(event);
    }));
  }

  keyboard(data: string): void {
    if (data === "\x03" && this.#hostSelectionActive) {
      this.#hostSelectionActive = false;
      this.timeline.push({ atMs: this.#elapsed(), type: "keyboard", detail: { data: JSON.stringify(data), consumedBy: "host-selection" } });
      return;
    }
    const alreadyWin32 = /^\x1b\[\d+;\d+;\d+;[01];\d+;\d+_$/.test(data);
    const encoded = this.#win32InputMode && !alreadyWin32 ? encodeWin32PhysicalInput(data) : data;
    this.#requireChild().write(encoded);
    this.timeline.push({ atMs: this.#elapsed(), type: "keyboard", detail: { data: JSON.stringify(data), encoded: JSON.stringify(encoded) } });
  }

  selectHostText(row = this.#terminal.buffer.active.cursorY): boolean {
    const selected = this.#terminal.modes.mouseTrackingMode === "none" && !(this.#win32InputMode && this.#conptyMouseFallback);
    this.#hostSelectionActive = selected;
    this.#hostSelectionInitialRow = row;
    this.#hostSelectionBaseY = this.#terminal.buffer.active.baseY;
    this.timeline.push({ atMs: this.#elapsed(), type: "mouse", detail: { generatedAs: selected ? "host-selection" : "application-selection", row } });
    return selected;
  }

  hostSelectionRow(): number | null {
    if (!this.#hostSelectionActive) return null;
    return this.#hostSelectionInitialRow - (this.#terminal.buffer.active.baseY - this.#hostSelectionBaseY);
  }

  arrow(direction: "up" | "down" | "left" | "right"): void {
    const win32: Record<typeof direction, string> = {
      up: "\x1b[38;72;0;1;256;1_",
      down: "\x1b[40;80;0;1;256;1_",
      left: "\x1b[37;75;0;1;256;1_",
      right: "\x1b[39;77;0;1;256;1_",
    };
    const legacy: Record<typeof direction, string> = { up: "\x1b[A", down: "\x1b[B", left: "\x1b[D", right: "\x1b[C" };
    this.keyboard(this.#win32InputMode ? win32[direction] : legacy[direction]);
  }

  paste(text: string): void {
    const data = this.#terminal.modes.bracketedPasteMode ? `\x1b[200~${text}\x1b[201~` : text;
    this.#requireChild().write(this.#win32InputMode ? encodeWin32PhysicalInput(data) : data);
    this.timeline.push({ atMs: this.#elapsed(), type: "paste", detail: { text, bracketed: this.#terminal.modes.bracketedPasteMode } });
  }

  focus(focused: boolean): void {
    const delivered = this.#terminal.modes.sendFocusMode;
    if (delivered) {
      const data = focused ? "\x1b[I" : "\x1b[O";
      this.#requireChild().write(this.#win32InputMode ? encodeWin32PhysicalInput(data) : data);
    }
    this.timeline.push({ atMs: this.#elapsed(), type: "focus", detail: { focused, delivered } });
  }

  mouse(column: number, row: number, button = 0, release = false): void {
    const tracking = this.#terminal.modes.mouseTrackingMode;
    let data: string | null = null;
    if (tracking !== "none" || (this.#win32InputMode && this.#conptyMouseFallback)) {
      data = this.#mouseProtocol === "sgr"
        ? `\x1b[<${button};${column};${row}${release ? "m" : "M"}`
        : `\x1b[M${String.fromCharCode(button + 32, column + 32, row + 32)}`;
      this.#requireChild().write(data);
    }
    this.timeline.push({ atMs: this.#elapsed(), type: "mouse", detail: { column, row, button, release, generatedAs: data ? "mouse-report" : "host-selection", data } });
  }

  wheel(column: number, row: number, direction: "up" | "down"): { generatedAs: "mouse-report" | "alternate-scroll-arrow" | "terminal-scrollback"; rows: number } {
    const tracking = this.#terminal.modes.mouseTrackingMode;
    let data: string | null = null;
    let generatedAs: "mouse-report" | "alternate-scroll-arrow" | "terminal-scrollback";
    if (tracking !== "none" || (this.#win32InputMode && this.#conptyMouseFallback)) {
      const button = direction === "up" ? 64 : 65;
      data = this.#mouseProtocol === "sgr"
        ? `\x1b[<${button};${column};${row}M`
        : `\x1b[M${String.fromCharCode(button + 32, column + 32, row + 32)}`;
      generatedAs = "mouse-report";
    } else if (this.#alternateScroll && this.#terminal.buffer.active === this.#terminal.buffer.alternate) {
      data = this.#win32InputMode
        ? direction === "up" ? "\x1b[38;72;0;1;256;3_" : "\x1b[40;80;0;1;256;3_"
        : direction === "up" ? "\x1b[A" : "\x1b[B";
      generatedAs = "alternate-scroll-arrow";
    } else {
      this.#terminal.scrollLines(direction === "up" ? -3 : 3);
      generatedAs = "terminal-scrollback";
    }
    if (data) this.#requireChild().write(data);
    const rows = generatedAs === "terminal-scrollback" || generatedAs === "alternate-scroll-arrow" ? 3 : 0;
    this.timeline.push({ atMs: this.#elapsed(), type: "mouse", detail: { column, row, direction, generatedAs, rows, data } });
    return { generatedAs, rows };
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
    const cells = Array.from({ length: this.#terminal.rows }, (_, row) => {
      const line = buffer.getLine(buffer.viewportY + row);
      return Array.from({ length: this.#terminal.cols }, (_, column) => {
        const cell = line?.getCell(column);
        if (!cell) return emptyCell();
        const attributes = (cell.isBold() ? 1 : 0) | (cell.isItalic() ? 2 : 0) | (cell.isUnderline() ? 4 : 0)
          | (cell.isInverse() ? 8 : 0) | (cell.isDim() ? 16 : 0) | (cell.isBlink() ? 32 : 0)
          | (cell.isInvisible() ? 64 : 0) | (cell.isStrikethrough() ? 128 : 0) | (cell.isOverline() ? 256 : 0);
        return {
          character: cell.getChars() || " ",
          width: cell.getWidth(),
          foreground: normalizedColor(cell.isFgDefault(), cell.isFgRGB(), cell.getFgColor()),
          background: normalizedColor(cell.isBgDefault(), cell.isBgRGB(), cell.getBgColor()),
          attributes,
        };
      });
    });
    const frame = {
      name,
      capturedAtMs: this.#elapsed(),
      columns: this.#terminal.cols,
      rows: this.#terminal.rows,
      lines,
      cells,
      cursor: { column: buffer.cursorX, row: buffer.cursorY, visible: this.#cursorVisible, style: this.#cursorStyle },
      activeScreen: buffer === this.#terminal.buffer.alternate ? "alternate" as const : "normal" as const,
      scrollbackLines: buffer === this.#terminal.buffer.normal ? buffer.baseY : 0,
      viewportOffset: buffer === this.#terminal.buffer.normal ? buffer.baseY - buffer.viewportY : 0,
      modes: {
        bracketedPaste: this.#terminal.modes.bracketedPasteMode,
        focusReporting: this.#terminal.modes.sendFocusMode,
        mouseTracking: this.#terminal.modes.mouseTrackingMode === "none" && this.#win32InputMode && this.#conptyMouseFallback
          ? "any"
          : this.#terminal.modes.mouseTrackingMode,
      },
    };
    this.frames.push(frame);
    return frame;
  }

  async waitFor(text: string, deadlineMs: number, frameName?: string, pollMs = 25): Promise<NormalizedFrame> {
    const deadline = performance.now() + deadlineMs;
    while (performance.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, pollMs));
      const frame = this.capture(frameName ?? `wait-${this.frames.length}`);
      if (frame.lines.join("\n").includes(text)) return frame;
      this.frames.pop();
    }
    const final = this.capture(frameName ?? "deadline-final");
    throw new Error(`terminal condition ${JSON.stringify(text)} not reached after ${deadlineMs}ms\n${final.lines.join("\n")}`);
  }

  async waitForExit(deadlineMs = 5_000): Promise<{ exitCode: number; signal?: number }> {
    if (!this.#exit) throw new Error("outer PTY is not running");
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`outer PTY did not exit after ${deadlineMs}ms`)), deadlineMs));
    return await Promise.race([this.#exit, timeout]);
  }

  async stopUi(): Promise<void> {
    if (!this.#child) return;
    this.timeline.push({ atMs: this.#elapsed(), type: "stop", detail: "terminate UI process without terminal input" });
    if (!this.#exited) {
      try { process.kill(this.#child.pid, "SIGTERM"); } catch {}
    }
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

function encodeWin32PhysicalInput(data: string): string {
  let encoded = "";
  for (const character of data) {
    const codepoint = character.codePointAt(0) ?? 0;
    const control = codepoint > 0 && codepoint < 27;
    const letter = /^[a-z]$/i.test(character);
    const digit = /^[0-9]$/.test(character);
    const virtualKey = codepoint === 13 ? 13 : codepoint === 27 ? 27 : control ? codepoint + 64 : letter ? character.toUpperCase().charCodeAt(0) : digit ? codepoint : codepoint === 32 ? 32 : 0;
    const scanCode = codepoint === 13 ? 28 : codepoint === 27 ? 1 : 0;
    const controlState = (control ? 8 : 0) | (letter && character === character.toUpperCase() ? 16 : 0);
    encoded += `\x1b[${virtualKey};${scanCode};${codepoint};1;${controlState};1_`;
  }
  return encoded;
}

function normalizedColor(isDefault: boolean, isRgb: boolean, value: number): { mode: "default" | "palette" | "rgb"; value: number } {
  return { mode: isDefault ? "default" : isRgb ? "rgb" : "palette", value };
}

function emptyCell(): NormalizedCell {
  return {
    character: " ",
    width: 1,
    foreground: { mode: "default", value: 0 },
    background: { mode: "default", value: 0 },
    attributes: 0,
  };
}

function killTree(pid: number): void {
  if (platform() === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
  else {
    try { process.kill(-pid, "SIGTERM"); } catch { try { process.kill(pid, "SIGTERM"); } catch {} }
  }
}
