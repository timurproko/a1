import { ImageAttachmentError, type OwnedUiShellClipboardContent } from "../../contracts/owned-ui/index.js";
import type { ClipboardImageData } from "./clipboard-image.js";
import type { OwnedUiClipboardServices } from "./clipboard-services.js";
import { runImageWorker } from "./image-preparation-client.js";
import type { PastePreparationClientOptions } from "./paste-preparation-client.js";
import type { PasteSource } from "./paste-protocol.js";
import { ResponseCopyCoordinator } from "./response-copy-coordinator.js";
import type { SelectionCopySnapshot } from "../../ui/components/index.js";
import { MAX_COPY_CONTROL_BYTES, type CopyResult, type ResponseCopyEvent } from "./response-copy-protocol.js";
import { createResponseCopyExecutor, responseCopyDestination, type OwnedResponseCopyExecutor, type ResponseCopyExecutor } from "./response-copy-transport.js";
import { writeSystemClipboardText } from "./system-clipboard.js";

/** A platform clipboard seam; production reads and writes through A1's system clipboard adapter. */
export interface OwnedUiClipboardPort {
  readText(signal?: AbortSignal): Promise<string | null>;
  readImage?(signal?: AbortSignal): Promise<{ readonly data: string; readonly mimeType: string } | null>;
  writeText?(text: string, signal?: AbortSignal): Promise<void>;
}

/** What one shell's clipboard needs: the borrowed process-wide helpers, its terminal, and optional test seams. */
export interface ShellClipboardOptions {
  /** Bare A1 owns response copy; comparison profiles keep the terminal-control write. */
  readonly ownedCopy: boolean;
  readonly shared?: OwnedUiClipboardServices;
  readonly clipboard?: OwnedUiClipboardPort;
  readonly responseCopy?: { readonly execute?: ResponseCopyExecutor; readonly onEvent?: (event: ResponseCopyEvent) => void };
  readonly pastePreparation?: Omit<PastePreparationClientOptions, "onEvent" | "spareIdleMs">;
  /** True when a test terminal stands in for the process terminal. */
  readonly substituteTerminal: boolean;
  readonly disposed: () => boolean;
  /** Whether the shell's terminal is running and attached. */
  readonly terminalAttached: () => boolean;
  readonly writeControl: (control: string) => void;
}

/**
 * One shell's clipboard: response copy, the comparison write path, clipboard reads, and paste capture. It
 * borrows the process-wide helper pools from composition and never disposes them.
 */
export class ShellClipboard {
  /** Null in comparison profiles, which keep the pinned terminal-control write. */
  readonly responseCopy: ResponseCopyCoordinator | null;
  readonly #options: ShellClipboardOptions;
  readonly #executor: OwnedResponseCopyExecutor | undefined;
  #pendingWrite: Promise<void> = Promise.resolve();

  constructor(options: ShellClipboardOptions) {
    this.#options = options;
    const { clipboard, shared, responseCopy } = options;
    this.#executor = !options.ownedCopy || responseCopy?.execute !== undefined ? undefined : createResponseCopyExecutor({
      ...(shared === undefined ? {} : { pool: shared.copy }),
      ...(!options.substituteTerminal && clipboard === undefined ? {} : { destination: "terminal" }),
      ...(clipboard?.writeText === undefined ? {} : { writeText: (text, signal) => clipboard.writeText!(text, signal) }),
      // Invariant: the owned host is the route contract. Pseudoterminal children must not infer
      // clipboard reachability from Node's view of stdout, and inactive shells are fenced here.
      terminal: { submit: async (control, signal) => {
        if (signal.aborted || options.disposed() || !options.terminalAttached()) throw new Error("Copy canceled");
        // Performance: never grow the real terminal's pending buffer with another clipboard payload.
        if (!options.substituteTerminal && process.stdout.writableLength + control.length > MAX_COPY_CONTROL_BYTES) {
          throw new Error("Clipboard terminal is busy");
        }
        options.writeControl(control);
      } },
    });
    this.responseCopy = !options.ownedCopy ? null : new ResponseCopyCoordinator({
      execute: responseCopy?.execute ?? this.#executor!,
      ...(responseCopy?.onEvent === undefined ? {} : { onEvent: responseCopy.onEvent }),
    });
  }

  /** Paste-preparation options carrying the shared paste pool, or undefined when neither is supplied. */
  pastePreparation(): Omit<PastePreparationClientOptions, "onEvent" | "spareIdleMs"> | undefined {
    const { pastePreparation, shared } = this.#options;
    if (pastePreparation === undefined && shared === undefined) return undefined;
    return { ...pastePreparation, ...(shared === undefined ? {} : { pool: shared.paste }) };
  }

  /** Copies text: through owned response copy when present, otherwise the comparison terminal-control write. */
  copyText(text: string): Promise<CopyResult> | undefined {
    if (this.responseCopy !== null) return this.responseCopy.submitText(text);
    const { clipboard } = this.#options;
    const write = () => {
      if (this.#options.disposed()) return Promise.resolve();
      this.#options.writeControl(`\u001b]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`);
      return clipboard === undefined ? writeSystemClipboardText(text) : clipboard.writeText?.(text) ?? Promise.resolve();
    };
    // Compatibility: comparison profiles retain their existing clipboard path.
    this.#pendingWrite = write().catch(() => {});
    return undefined;
  }

  /** Copies a selection after any pending comparison write has settled. */
  copySelection(snapshot: SelectionCopySnapshot): Promise<CopyResult> | undefined {
    return this.responseCopy?.submit(snapshot, this.#pendingWrite);
  }

  /** Reads the clipboard once any write this shell started has settled. */
  async readContent(signal = new AbortController().signal): Promise<OwnedUiShellClipboardContent | null> {
    await this.#pendingWrite;
    return this.#read(signal);
  }

  capturePaste(): PasteSource {
    const before = this.responseCopy?.capturePasteBarrier() ?? (async () => true);
    if (this.#options.clipboard !== undefined) return { kind: "provided", read: signal => this.#read(signal), before };
    if (responseCopyDestination(process.env) === "terminal") return {
      kind: "provided", before, read: async () => { throw new ImageAttachmentError("paste-unavailable"); },
    };
    return { kind: "native", before };
  }

  /** The extension clipboard writer: true once delivered, false when submitted without confirmation. */
  async writeForExtension(text: string): Promise<boolean> {
    const result = await this.responseCopy!.submitText(text);
    if (result.outcome === "delivered") return true;
    if (result.outcome === "submitted-unverified") return false;
    throw new Error(result.outcome === "timed-out" ? "Clipboard delivery timed out" : "Clipboard delivery could not be completed");
  }

  warm(): void { this.#executor?.warm(); }

  reset(): void { this.responseCopy?.reset(); }

  dispose(): void {
    this.responseCopy?.dispose();
    this.#executor?.dispose();
  }

  async #read(signal: AbortSignal): Promise<OwnedUiShellClipboardContent | null> {
    if (signal.aborted) throw new ImageAttachmentError("image-canceled");
    const { clipboard } = this.#options;
    if (clipboard === undefined) return runImageWorker({ kind: "clipboard" }, signal);
    try {
      const image = await clipboard.readImage?.(signal);
      if (image !== null && image !== undefined) {
        const canonical = await runImageWorker<ClipboardImageData | null>({ kind: "canonicalize", source: image }, signal);
        if (canonical !== null) return { kind: "image", ...canonical };
      }
    } catch (error) {
      if (error instanceof ImageAttachmentError) throw error;
      // Compatibility: an unavailable image reader can still provide text.
    }
    const text = await clipboard.readText(signal);
    return text === null ? null : { kind: "text", text };
  }
}
