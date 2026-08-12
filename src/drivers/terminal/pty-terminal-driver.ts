import { appendFileSync } from "node:fs";
import Headless from "@xterm/headless";
const { Terminal } = Headless;
import type {
  AgentId,
  GenerationId,
  TerminalAgentProfile,
  TerminalDimensions,
  TerminalRenderAtomicBoundary,
  TerminalRenderTransaction,
  TerminalSourceSequenceRange,
  TerminalDriver,
  TerminalDriverEvent,
  TerminalDriverHandle,
  TerminalModes,
  TerminalSurface,
} from "../../domain/index.js";
import { assertDimensions } from "../../domain/index.js";
import { ModeAwareTerminalInputEncoder } from "../../terminal-input.js";
import { NodePtyProcessBackend, type TerminalProcess, type TerminalProcessBackend } from "./pty-backend.js";
import { installTerminalResponses, writeTerminalOutput } from "./terminal-responses.js";
import { PtyOutputTransactionAssembler, type AssembledPtyOutput } from "./output-transaction-assembler.js";
import { ResidentTerminalState } from "./resident-terminal-state.js";

const MAX_SCROLLBACK_LINES = 500;

/** Application-agnostic PTY terminal driver. Profile kind never selects emulation or rendering behavior. */
export class PtyTerminalDriver implements TerminalDriver {
  constructor(private readonly processBackend: TerminalProcessBackend = new NodePtyProcessBackend()) {}

  async start(
    agentId: AgentId,
    generationId: GenerationId,
    profile: TerminalAgentProfile,
    emit: (event: TerminalDriverEvent) => void,
  ): Promise<TerminalDriverHandle> {
    assertDimensions(profile.dimensions);
    const processBackend = this.processBackend;
    const terminal = new Terminal({
      cols: profile.dimensions.columns,
      rows: profile.dimensions.rows,
      scrollback: MAX_SCROLLBACK_LINES,
      allowProposedApi: true,
    });
    const environment: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) if (value !== undefined) environment[key] = value;
    Object.assign(environment, profile.environment, {
      TERM: profile.terminalType,
      COLORTERM: profile.environment.COLORTERM ?? "truecolor",
      TERM_PROGRAM: "addone",
    });

    let child: TerminalProcess;
    try {
      child = processBackend.spawn(profile, environment);
    } catch (error) {
      throw new Error(`failed to start terminal profile '${profile.kind}': ${error instanceof Error ? error.message : String(error)}`);
    }

    let revision = 0;
    let outputSequence = 0;
    let lastSurface: TerminalSurface | null = null;
    let lastPublishedSurface: TerminalSurface | null = null;
    let exited = false;
    let terminalWrites = Promise.resolve();
    const evidencePath = process.env.ADDONE_TERMINAL_PROTOCOL_EVIDENCE;
    const trace = (stage: string, detail: Readonly<Record<string, unknown>>) => {
      if (!evidencePath) return;
      try { appendFileSync(evidencePath, `${JSON.stringify({ at: new Date().toISOString(), pid: process.pid, role: "terminal-driver", stage, ...detail })}\n`); } catch {}
    };
    const inputEncoder = new ModeAwareTerminalInputEncoder();
    const modeTracker = new TerminalModeTracker();
    const sendTerminalResponse = (response: import("../../domain/index.js").TerminalResponse) => {
      if (!exited) child.write(Buffer.from(response.bytes).toString("utf8"));
    };
    const disposeTerminalResponses = installTerminalResponses(terminal, sendTerminalResponse);
    const residentState = new ResidentTerminalState(terminal, MAX_SCROLLBACK_LINES);

    const capture = (sequence: number, final = false): TerminalSurface => {
      lastSurface = residentState.capture(sequence, revision + 1, final, {
        cursorVisible: modeTracker.cursorVisible,
        cursorStyle: modeTracker.cursorStyle,
        cursorBlinking: modeTracker.cursorBlinking,
        modes: terminalModes(
          terminal.modes,
          modeTracker,
          processBackend.platform === "win32",
          terminal.buffer.active === terminal.buffer.alternate,
          profile.conptyMouseFallback,
        ),
      });
      return lastSurface;
    };

    const publishTransaction = (
      surface: TerminalSurface,
      sourceSequence: TerminalSourceSequenceRange,
      atomicBoundary: TerminalRenderAtomicBoundary,
      requiresResynchronization = false,
    ) => {
      const previous = lastPublishedSurface;
      if (!previous || previous.columns !== surface.columns || previous.rows !== surface.rows || requiresResynchronization) {
        trace("virtual-snapshot", { revision: surface.revision, sourceSequence, atomicBoundary, requiresResynchronization });
        revision = surface.revision;
        lastSurface = surface;
        lastPublishedSurface = surface;
        emit({ type: "surface", agentId, generationId, surface });
        return;
      }
      const transaction = createRenderTransaction(generationId, previous, surface, sourceSequence, atomicBoundary);
      if (!surface.final && transaction.operations.length === 0 && transaction.dirtyRanges.length === 0
        && sameCursor(previous, surface) && sameModes(previous.modes, surface.modes)) {
        lastSurface = { ...surface, revision: previous.revision };
        lastPublishedSurface = lastSurface;
        return;
      }
      trace("virtual-transaction", {
        revision: transaction.revision,
        sourceSequence: transaction.sourceSequence,
        atomicBoundary: transaction.atomicBoundary,
        dirtyRangeCount: transaction.dirtyRanges.length,
        operationCount: transaction.operations.length,
      });
      revision = surface.revision;
      lastSurface = surface;
      lastPublishedSurface = surface;
      emit({ type: "transaction", agentId, generationId, surface, transaction });
    };

    const processOutput = (assembled: AssembledPtyOutput): void => {
      trace("assembled-output", {
        sourceSequence: assembled.sourceSequence,
        atomicBoundary: assembled.atomicBoundary,
        readCount: assembled.readCount,
        bytes: Buffer.byteLength(assembled.data, "utf8"),
        dataBase64: Buffer.from(assembled.data, "utf8").toString("base64"),
      });
      terminalWrites = terminalWrites.then(async () => {
        modeTracker.observe(assembled.data);
        await writeTerminalOutput(terminal, assembled.data, sendTerminalResponse);
        publishTransaction(
          capture(assembled.sourceSequence.end, assembled.final),
          assembled.sourceSequence,
          assembled.atomicBoundary,
          assembled.requiresResynchronization,
        );
      });
    };
    const assembler = new PtyOutputTransactionAssembler(processOutput);

    child.onData(data => {
      trace("pty-read", { bytes: Buffer.byteLength(data, "utf8"), dataBase64: Buffer.from(data, "utf8").toString("base64") });
      outputSequence = assembler.push(data);
    });
    child.onExit(({ exitCode, signal }) => {
      exited = true;
      assembler.flushFinal();
      void terminalWrites.then(() => {
        if (!lastSurface?.final) {
          publishTransaction(
            capture(outputSequence, true),
            { start: outputSequence, end: outputSequence },
            "exit",
          );
        }
        assembler.dispose();
        disposeTerminalResponses();
        emit({ type: "exit", agentId, generationId, exitCode, signal: signal ?? null, surface: lastSurface });
      });
    });

    const inputBatch = (events: readonly import("../../domain/index.js").HostTerminalInputEvent[]): void => {
      if (exited || !lastSurface) return;
      let pendingChildBytes: Buffer[] = [];
      const flushChildBytes = () => {
        if (pendingChildBytes.length === 0) return;
        child.write(Buffer.concat(pendingChildBytes).toString("utf8"));
        pendingChildBytes = [];
      };
      for (const event of events) {
        const encoded = inputEncoder.encode(event, lastSurface.modes, lastSurface.activeScreen);
        trace("semantic-input", { event, keyboardProtocol: lastSurface.modes.keyboardProtocol, activeScreen: lastSurface.activeScreen, route: encoded.route, bytesHex: Buffer.from(encoded.bytes).toString("hex") });
        if (encoded.route === "child" && encoded.bytes.length > 0) {
          pendingChildBytes.push(Buffer.from(encoded.bytes));
          continue;
        }
        flushChildBytes();
        if (encoded.route === "virtual-scrollback" && event.type === "mouse" && event.action === "wheel") {
          terminal.scrollLines(event.wheelDelta > 0 ? -3 : 3);
          publishTransaction(capture(outputSequence, false), { start: outputSequence, end: outputSequence }, "io-turn");
        }
      }
      flushChildBytes();
    };

    return {
      agentId,
      generationId,
      input(event): void { inputBatch([event]); },
      inputBatch,
      resize(dimensions: TerminalDimensions): void {
        assertDimensions(dimensions);
        if (exited) return;
        assembler.flushBeforeResize();
        terminalWrites = terminalWrites.then(() => {
          if (exited) return;
          terminal.resize(dimensions.columns, dimensions.rows);
          child.resize(dimensions.columns, dimensions.rows);
          const surface = capture(outputSequence, false);
          revision = surface.revision;
          lastSurface = surface;
          lastPublishedSurface = surface;
          emit({ type: "surface", agentId, generationId, surface });
        });
      },
      async stop(): Promise<void> {
        if (exited) return;
        processBackend.stop(child);
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

class TerminalModeTracker {
  cursorVisible = true;
  cursorStyle: "default" | "block" | "underline" | "bar" = "default";
  cursorBlinking = true;
  mouseProtocol: TerminalModes["mouseProtocol"] = "x10";
  alternateScroll = false;
  modifyOtherKeys: 0 | 1 | 2 = 0;
  kittyKeyboardFlags = 0;
  win32InputMode = false;
  synchronizedOutput = false;
  #tail = "";

  observe(data: string): void {
    const previousLength = this.#tail.length;
    const combined = `${this.#tail}${data}`;
    const isNew = (match: RegExpMatchArray) => (match.index ?? 0) + match[0].length > previousLength;
    for (const match of combined.matchAll(/\x1b\[\?([0-9;]+)([hl])/g)) {
      if (!isNew(match)) continue;
      const enabled = match[2] === "h";
      for (const value of (match[1] ?? "").split(";").map(Number)) {
        if (value === 25) this.cursorVisible = enabled;
        if (value === 1007) this.alternateScroll = enabled;
        if (value === 9001) this.win32InputMode = enabled;
        if (value === 2026) this.synchronizedOutput = enabled;
        if (enabled && value === 1005) this.mouseProtocol = "utf8";
        if (enabled && value === 1006) this.mouseProtocol = "sgr";
        if (enabled && value === 1015) this.mouseProtocol = "urxvt";
        if (!enabled && [1005, 1006, 1015].includes(value)) this.mouseProtocol = "x10";
      }
    }
    for (const match of combined.matchAll(/\x1b\[([0-6]?) q/g)) {
      if (!isNew(match)) continue;
      const value = Number(match[1] || 0);
      this.cursorStyle = value === 0 ? "default" : value >= 5 ? "bar" : value >= 3 ? "underline" : "block";
      this.cursorBlinking = value === 0 || value % 2 === 1;
    }
    for (const match of combined.matchAll(/\x1b\[>4;([012])m/g)) {
      if (isNew(match)) this.modifyOtherKeys = Number(match[1]) as 0 | 1 | 2;
    }
    for (const match of combined.matchAll(/\x1b\[(?:(>)(\d+)u|(<)u)/g)) {
      if (!isNew(match)) continue;
      this.kittyKeyboardFlags = match[1] === ">" ? Number(match[2]) : 0;
    }
    this.#tail = combined.slice(-64);
  }
}

function createRenderTransaction(
  generationId: GenerationId,
  previous: TerminalSurface,
  current: TerminalSurface,
  sourceSequence: TerminalSourceSequenceRange,
  atomicBoundary: TerminalRenderAtomicBoundary,
): TerminalRenderTransaction {
  const scrollRows = previous.activeScreen === "normal" && current.activeScreen === "normal"
    ? Math.max(0, Math.min(current.rows, (current.scrollbackBase ?? 0) - (previous.scrollbackBase ?? 0)))
    : 0;
  const dirtyRanges = current.cells.flatMap((row, rowIndex) => {
    const oldRow = previous.cells[rowIndex + scrollRows] ?? [];
    let first = -1;
    let last = -1;
    for (let column = 0; column < row.length; column++) {
      if (!sameCell(oldRow[column], row[column])) {
        if (first < 0) first = column;
        last = column;
      }
    }
    return first < 0 ? [] : [{ row: rowIndex, startColumn: first, cells: row.slice(first, last + 1) }];
  });
  const operations: TerminalRenderTransaction["operations"] = [
    ...(scrollRows > 0 ? [{ type: "scroll" as const, top: 0, bottom: current.rows - 1, rows: scrollRows }] : []),
    ...(previous.activeScreen !== current.activeScreen ? [{ type: "screen" as const, activeScreen: current.activeScreen }] : []),
    ...dirtyRanges.filter(range => range.cells.every(cell => cell.character === " " && cell.attributes === 0 && !cell.foreground && !cell.background))
      .map(range => ({ type: "erase" as const, row: range.row, startColumn: range.startColumn, endColumn: range.startColumn + range.cells.length })),
  ];
  return {
    generationId,
    baseRevision: previous.revision,
    revision: current.revision,
    sourceSequence,
    atomicBoundary,
    dimensions: { columns: current.columns, rows: current.rows },
    operations,
    dirtyRanges,
    cursor: current.cursor,
    activeScreen: current.activeScreen,
    modes: current.modes,
    final: current.final,
  };
}

function sameCursor(previous: TerminalSurface, current: TerminalSurface): boolean {
  return previous.cursor.column === current.cursor.column
    && previous.cursor.row === current.cursor.row
    && previous.cursor.visible === current.cursor.visible
    && previous.cursor.style === current.cursor.style
    && previous.cursor.blinking === current.cursor.blinking;
}

function sameModes(left: TerminalModes, right: TerminalModes): boolean {
  return Object.keys(left).every(key => left[key as keyof TerminalModes] === right[key as keyof TerminalModes]);
}

function sameCell(left: TerminalSurface["cells"][number][number] | undefined, right: TerminalSurface["cells"][number][number] | undefined): boolean {
  return left?.character === right?.character
    && left?.width === right?.width
    && left?.attributes === right?.attributes
    && left?.foreground?.mode === right?.foreground?.mode
    && left?.foreground?.value === right?.foreground?.value
    && left?.background?.mode === right?.background?.mode
    && left?.background?.value === right?.background?.value;
}

function terminalModes(
  modes: InstanceType<typeof Terminal>["modes"],
  tracker: TerminalModeTracker,
  conpty: boolean,
  alternateScreen: boolean,
  conptyMouseFallback: TerminalAgentProfile["conptyMouseFallback"],
): TerminalModes {
  const fallbackMouse = conpty && alternateScreen && conptyMouseFallback === "sgr-any-on-alternate-screen"
    && modes.mouseTrackingMode === "none";
  return {
    applicationCursorKeys: modes.applicationCursorKeysMode,
    applicationKeypad: modes.applicationKeypadMode,
    alternateScroll: tracker.alternateScroll,
    bracketedPaste: modes.bracketedPasteMode,
    focusReporting: modes.sendFocusMode,
    mouseTracking: fallbackMouse ? "any" : modes.mouseTrackingMode,
    mouseProtocol: fallbackMouse ? "sgr" : tracker.mouseProtocol,
    synchronizedOutput: modes.synchronizedOutputMode || tracker.synchronizedOutput,
    wraparound: modes.wraparoundMode,
    // ConPTY consumes DECSET 9001 and translates host-facing VT input for the
    // Windows child. Encoding another keyboard protocol here would bypass the
    // transport-owned translation and duplicate or corrupt functional keys.
    keyboardProtocol: tracker.win32InputMode ? (conpty ? "legacy" : "win32") : tracker.kittyKeyboardFlags > 0 ? "kitty" : tracker.modifyOtherKeys > 0 ? "modify-other-keys" : "legacy",
    modifyOtherKeys: tracker.modifyOtherKeys,
    kittyKeyboardFlags: tracker.kittyKeyboardFlags,
    win32InputMode: tracker.win32InputMode,
  };
}
