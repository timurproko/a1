import { createHash } from "node:crypto";
import { spawn as spawnPty } from "node-pty";
import headless from "@xterm/headless";
import { spawnSync } from "node:child_process";

const { Terminal } = headless;

const MAX_RAW_BYTES = 2 * 1024 * 1024;
const MAX_RAW_EXCERPT = 16 * 1024;
const DEFAULT_SETTLE_MS = 250;
const DEFAULT_ACTION_TIMEOUT_MS = 12_000;

export class TerminalParitySession {
  #terminal;
  #pty;
  #producer;
  #raw = "";
  #rawBytes = 0;
  #rawTruncated = false;
  #rawCheckpointOffset = 0;
  #writeQueue = Promise.resolve();
  #lastOutputAt = Date.now();
  #exit = undefined;
  #exitPromise;
  #resolveExit;
  #disposed = false;
  #checkpoints = [];

  constructor(options) {
    this.#producer = options.producer;
    this.geometry = Object.freeze({ columns: options.columns, rows: options.rows });
    this.capabilities = Object.freeze({
      term: options.environment.TERM ?? null,
      colorTerm: options.environment.COLORTERM ?? null,
      forceColor: options.environment.FORCE_COLOR ?? null,
      offline: options.environment.PI_OFFLINE ?? null,
    });
    this.#terminal = new Terminal({
      cols: options.columns,
      rows: options.rows,
      allowProposedApi: true,
      scrollback: 2_000,
      logLevel: "off",
      windowsPty: process.platform === "win32" ? { backend: "conpty", buildNumber: windowsBuildNumber() } : undefined,
    });
    this.#exitPromise = new Promise(resolve => { this.#resolveExit = resolve; });
    this.#pty = spawnPty(options.executable, [...options.arguments], {
      name: options.environment.TERM ?? "xterm-256color",
      cols: options.columns,
      rows: options.rows,
      cwd: options.cwd,
      env: options.environment,
      ...(process.platform === "win32" ? { useConpty: true } : {}),
    });
    this.pid = this.#pty.pid;
    this.#pty.onData(data => this.#acceptOutput(data));
    this.#pty.onExit(event => {
      this.#exit = { code: event.exitCode, signal: event.signal ?? null };
      this.#resolveExit?.(this.#exit);
    });
    this.#terminal.onData(data => this.#safeWrite(data));
    this.#terminal.onBinary(data => this.#safeWrite(Buffer.from(data, "binary")));
  }

  /** What the emulator has on screen right now, as the waits read it. */
  get screen() {
    return visibleText(this.#terminal);
  }

  get checkpoints() {
    return this.#checkpoints;
  }

  async settle(options = {}) {
    const quietMs = options.quietMs ?? DEFAULT_SETTLE_MS;
    const timeoutMs = options.timeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      await delay(Math.min(quietMs, 50));
      await this.#writeQueue;
      if (Date.now() - this.#lastOutputAt >= quietMs) return;
      if (this.#exit) return;
    }
    throw new Error(`${this.#producer} terminal did not settle within ${timeoutMs}ms`);
  }

  async waitForText(pattern, timeoutMs = DEFAULT_ACTION_TIMEOUT_MS) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      await this.#writeQueue;
      // Everything written so far, not only what is still on screen: startup
      // output can scroll the very text being waited for out of the viewport,
      // which is what a taller startup on one platform does.
      const rows = writtenText(this.#terminal);
      if (typeof pattern === "string" ? rows.includes(pattern) : pattern.test(rows)) return;
      if (this.#exit) throw new Error(`${this.#producer} exited before expected terminal text appeared`);
      await delay(50);
    }
    throw new Error(`${this.#producer} did not render ${String(pattern)} within ${timeoutMs}ms`);
  }

  write(data) {
    if (this.#exit) throw new Error(`${this.#producer} already exited`);
    this.#safeWrite(data);
  }

  resize(columns, rows) {
    if (this.#exit) throw new Error(`${this.#producer} already exited`);
    this.#terminal.resize(columns, rows);
    this.#pty.resize(columns, rows);
  }

  scrollViewport(lines) {
    if (this.#exit) throw new Error(`${this.#producer} already exited`);
    this.#terminal.scrollLines(lines);
  }

  capture(name, domains) {
    const buffer = this.#terminal.buffer.active;
    const rows = [];
    const geometry = [];
    for (let viewportRow = 0; viewportRow < this.#terminal.rows; viewportRow += 1) {
      const line = buffer.getLine(buffer.viewportY + viewportRow);
      const rawText = line?.translateToString(false, 0, this.#terminal.cols) ?? "".padEnd(this.#terminal.cols);
      const text = rawText.replace(/\s+$/u, "");
      rows.push({
        text,
        rawText,
        wrapped: line?.isWrapped ?? false,
        styles: line ? styleRuns(line, this.#terminal.cols) : [],
      });
      if (text.length > 0) geometry.push({ start: viewportRow, end: viewportRow });
    }
    const coalescedGeometry = coalesceGeometry(geometry);
    const rawSegment = this.#raw.slice(this.#rawCheckpointOffset);
    this.#rawCheckpointOffset = this.#raw.length;
    const checkpoint = {
      name,
      domains: [...domains],
      dimensions: { columns: this.#terminal.cols, rows: this.#terminal.rows },
      cursor: { x: buffer.cursorX, y: buffer.cursorY },
      scroll: { viewportY: buffer.viewportY, baseY: buffer.baseY, length: buffer.length },
      modes: terminalModes(this.#terminal.modes),
      rows,
      rawSgr: [...rawSegment.matchAll(/\x1b\[[0-9:;<=>?]*m/g)].map(match => escapeControls(match[0])).slice(-1_024),
      geometry: coalescedGeometry,
      frameHash: hashJson({ rows, cursor: { x: buffer.cursorX, y: buffer.cursorY }, scroll: { viewportY: buffer.viewportY, baseY: buffer.baseY } }),
    };
    this.#checkpoints.push(checkpoint);
    return checkpoint;
  }

  async shutdown(sequence = "\x04", timeoutMs = 5_000) {
    if (!this.#exit) this.#safeWrite(sequence);
    try {
      return await Promise.race([
        this.#exitPromise,
        delay(timeoutMs).then(() => { throw new Error(`${this.#producer} did not exit within ${timeoutMs}ms`); }),
      ]);
    } catch (error) {
      await this.killTree();
      throw error;
    }
  }

  async killTree() {
    if (this.#disposed) return;
    if (!this.#exit) {
      killProcessTree(this.pid);
      await Promise.race([this.#exitPromise, delay(1_000)]);
    }
    try { this.#pty.kill(); } catch {}
  }

  async result() {
    await this.#writeQueue;
    const raw = this.#raw;
    return {
      producer: this.#producer,
      pid: this.pid,
      geometry: this.geometry,
      capabilities: this.capabilities,
      checkpoints: this.#checkpoints,
      exit: this.#exit ?? { code: null, signal: null },
      screen: visibleText(this.#terminal),
      restoration: {
        cursorShown: /\x1b\[\?25h/.test(raw),
        alternateScreenLeft: /\x1b\[\?(?:47|1047|1049)l/.test(raw),
        synchronizedOutputLeft: /\x1b\[\?2026l/.test(raw),
      },
      raw: {
        sha256: createHash("sha256").update(raw).digest("hex"),
        bytes: this.#rawBytes,
        truncated: this.#rawTruncated,
        excerpt: escapeControls(raw.slice(-MAX_RAW_EXCERPT)),
      },
    };
  }

  async dispose() {
    if (this.#disposed) return;
    await this.killTree();
    this.#disposed = true;
    this.#terminal.dispose();
  }

  #acceptOutput(data) {
    this.#lastOutputAt = Date.now();
    const bytes = Buffer.byteLength(data);
    this.#rawBytes += bytes;
    if (Buffer.byteLength(this.#raw) < MAX_RAW_BYTES) {
      const remaining = MAX_RAW_BYTES - Buffer.byteLength(this.#raw);
      this.#raw += Buffer.from(data).subarray(0, remaining).toString("utf8");
      if (bytes > remaining) this.#rawTruncated = true;
    } else {
      this.#rawTruncated = true;
    }
    this.#writeQueue = this.#writeQueue.then(() => new Promise(resolve => this.#terminal.write(data, resolve)));
  }

  #safeWrite(data) {
    if (this.#exit || this.#disposed) return;
    try { this.#pty.write(data); } catch {}
  }
}

export function inputForAction(action) {
  if (action.type === "text" || action.type === "raw") return action.value;
  if (action.type === "key") {
    const keys = {
      enter: "\r",
      escape: "\x1b",
      down: "\x1b[B",
      up: "\x1b[A",
      "ctrl-c": "\x03",
      "ctrl-d": "\x04",
      "ctrl-s": "\x13",
      "ctrl-u": "\x15",
    };
    const value = keys[action.key];
    if (value === undefined) throw new TypeError(`unknown parity key: ${action.key}`);
    return value;
  }
  if (action.type === "wheel") {
    const button = action.direction === "up" ? 64 : 65;
    return Array.from({ length: action.notches ?? 1 }, () => `\x1b[<${button};${action.column ?? 10};${action.row ?? 10}M`).join("");
  }
  throw new TypeError(`action ${action.type} does not produce terminal input`);
}

function styleRuns(line, columns) {
  const runs = [];
  let active;
  for (let column = 0; column < columns; column += 1) {
    const cell = line.getCell(column);
    if (!cell) continue;
    const style = {
      foreground: color(cell, "foreground"),
      background: color(cell, "background"),
      flags: styleFlags(cell),
    };
    const character = cell.getWidth() === 0 ? "" : cell.getChars() || " ";
    const key = JSON.stringify(style);
    if (active?.key === key) {
      active.end = column + 1;
      active.text += character;
    } else {
      active = { start: column, end: column + 1, text: character, ...style, key };
      runs.push(active);
    }
  }
  return runs.map(({ key: _key, ...run }) => run);
}

function color(cell, kind) {
  const foreground = kind === "foreground";
  const isDefault = foreground ? cell.isFgDefault() : cell.isBgDefault();
  const isRgb = foreground ? cell.isFgRGB() : cell.isBgRGB();
  const isPalette = foreground ? cell.isFgPalette() : cell.isBgPalette();
  const value = foreground ? cell.getFgColor() : cell.getBgColor();
  if (isDefault) return "default";
  if (isRgb) return `rgb:${value.toString(16).padStart(6, "0")}`;
  if (isPalette) return `palette:${value}`;
  return `mode:${foreground ? cell.getFgColorMode() : cell.getBgColorMode()}:${value}`;
}

function styleFlags(cell) {
  return [
    ["bold", cell.isBold()], ["italic", cell.isItalic()], ["dim", cell.isDim()],
    ["underline", cell.isUnderline()], ["blink", cell.isBlink()], ["inverse", cell.isInverse()],
    ["invisible", cell.isInvisible()], ["strikethrough", cell.isStrikethrough()], ["overline", cell.isOverline()],
  ].filter(([, enabled]) => Boolean(enabled)).map(([name]) => name);
}

function terminalModes(modes) {
  return {
    applicationCursorKeysMode: modes.applicationCursorKeysMode,
    applicationKeypadMode: modes.applicationKeypadMode,
    bracketedPasteMode: modes.bracketedPasteMode,
    insertMode: modes.insertMode,
    mouseTrackingMode: modes.mouseTrackingMode,
    originMode: modes.originMode,
    reverseWraparoundMode: modes.reverseWraparoundMode,
    sendFocusMode: modes.sendFocusMode,
    synchronizedOutputMode: modes.synchronizedOutputMode,
    wraparoundMode: modes.wraparoundMode,
  };
}

function coalesceGeometry(rows) {
  const result = [];
  for (const row of rows) {
    const previous = result.at(-1);
    if (previous && previous.end + 1 === row.start) previous.end = row.end;
    else result.push({ ...row });
  }
  return result;
}

function writtenText(terminal) {
  const buffer = terminal.buffer.active;
  return Array.from({ length: buffer.length }, (_, index) => buffer.getLine(index)?.translateToString(true) ?? "").join(String.fromCharCode(10));
}

function visibleText(terminal) {
  const buffer = terminal.buffer.active;
  return Array.from({ length: terminal.rows }, (_, index) => buffer.getLine(buffer.viewportY + index)?.translateToString(true) ?? "").join("\n");
}

function killProcessTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    return;
  }
  try { process.kill(-pid, "SIGKILL"); } catch {
    try { process.kill(pid, "SIGKILL"); } catch {}
  }
}

function windowsBuildNumber() {
  if (process.platform !== "win32") return 0;
  return Number(process.getSystemVersion?.().match(/\d+$/)?.[0] ?? 22621);
}

function escapeControls(value) {
  return value.replace(/[\x00-\x1f\x7f]/g, character => {
    if (character === "\n") return "\\n";
    if (character === "\r") return "\\r";
    if (character === "\t") return "\\t";
    return `\\x${character.charCodeAt(0).toString(16).padStart(2, "0")}`;
  });
}

function hashJson(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
