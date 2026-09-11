import { randomUUID } from "node:crypto";
import { PROMPT_HISTORY_MAX_TEXT_BYTES, type PromptHistoryKind, type PromptHistoryPort, type PromptHistorySnapshot } from "../../../contracts/owned-ui/index.js";
import type { PiShellEditorPort } from "../components/index.js";

/** Merges bounded recall snapshots; the editor alone owns browsing, draft, cursor, and undo state. */
export class PromptHistoryController {
  readonly #local = new Map<string, { text: string; committed: boolean }>();
  readonly #unsubscribe: Array<() => void>;
  #snapshot: PromptHistorySnapshot;
  #fallback: string[];
  #disposed = false;
  #generation = 0;
  #unsubscribeSnapshot: () => void;
  #unsubscribeFailure: () => void;
  #closeFailed = false;
  #closePromise: Promise<boolean> | undefined;

  constructor(readonly options: {
    editor: PiShellEditorPort;
    store: PromptHistoryPort;
    limit: number;
    fallback: readonly string[];
    active(): boolean;
    render(): void;
    failure(message: string): void;
  }) {
    if (options.editor.recall === undefined) throw new Error("The selected editor does not expose typed history");
    this.#snapshot = { revision: 0, limit: options.limit, entries: [] };
    this.#fallback = boundedTexts([...options.fallback].reverse(), options.limit);
    this.#unsubscribeSnapshot = this.#subscribeSnapshot();
    this.#unsubscribeFailure = options.store.onFailure(code => {
      if (this.#disposed) this.#closeFailed = true;
      else options.failure(`Prompt history ${code}; current-session recall remains available.`);
    });
    this.#unsubscribe = [
      options.editor.recall.observe(() => {
        if (this.#disposed) return;
        if (options.editor.recall!.position().index === -1) this.synchronize();
        options.store.refresh();
      }),
    ];
    this.synchronize();
  }

  start(): void { this.options.store.start(); }

  capture(text: string, kind: PromptHistoryKind, cwd: string, sessionId: string): void {
    const canonical = text.trim();
    if (!canonical || this.#disposed) return;
    const id = randomUUID(); const generation = this.#generation;
    this.#local.set(id, { text: canonical, committed: false });
    this.#boundLocal();
    this.synchronize();
    void this.options.store.record({ id, text: canonical, timestamp: Date.now(), kind, cwd, sessionId }).then(outcome => {
      if (this.#disposed || generation !== this.#generation) return;
      const local = this.#local.get(id);
      if (local === undefined || outcome !== "committed") return;
      local.committed = true;
      if (this.#snapshot.entries.some(entry => entry.submissionId === id)) this.#local.delete(id);
      this.synchronize();
    }).catch(() => {
      if (!this.#disposed) this.options.failure("Prompt history unavailable; current-session recall remains available.");
    });
  }

  rememberRecovery(text: string): void {
    if (this.#disposed || !text.trim()) return;
    const canonical = text.trim();
    if ([...this.#local.values()].some(item => item.text === canonical)
      || this.#snapshot.entries.some(item => item.text === canonical)) return;
    this.#local.set(randomUUID(), { text: canonical, committed: false });
    this.#boundLocal();
    this.synchronize();
  }

  synchronize(): void {
    if (this.#disposed || !this.options.active()) return;
    const values = [...this.#local.values()].reverse().map(item => item.text)
      .concat(this.#snapshot.entries.map(item => item.text), this.#fallback);
    this.options.editor.recall!.replace(boundedTexts(values, this.#snapshot.limit));
    this.options.render();
  }

  reset(fallback: readonly string[]): void {
    this.#generation++;
    this.#unsubscribeSnapshot();
    this.#unsubscribeSnapshot = this.#subscribeSnapshot();
    this.#fallback = boundedTexts([...fallback].reverse(), this.options.limit);
    this.#local.clear();
    this.options.editor.recall!.reset();
    this.synchronize();
    this.options.store.refresh();
  }

  close(): Promise<boolean> {
    if (this.#closePromise !== undefined) return this.#closePromise;
    this.#disposed = true;
    this.#unsubscribeSnapshot();
    for (const unsubscribe of this.#unsubscribe) unsubscribe();
    this.#local.clear(); this.#fallback = [];
    this.#closePromise = this.options.store.close().then(() => !this.#closeFailed, () => false)
      .finally(() => this.#unsubscribeFailure());
    return this.#closePromise;
  }

  #subscribeSnapshot(): () => void {
    const generation = this.#generation;
    return this.options.store.onSnapshot(snapshot => {
      if (this.#disposed || generation !== this.#generation || snapshot.revision < this.#snapshot.revision) return;
      this.#snapshot = snapshot;
      for (const [id, entry] of this.#local) {
        if (entry.committed) this.#local.delete(id);
      }
      this.synchronize();
    });
  }

  #boundLocal(): void {
    let bytes = [...this.#local.values()].reduce((sum, item) => sum + Buffer.byteLength(item.text), 0);
    while (this.#local.size > this.options.limit || bytes > PROMPT_HISTORY_MAX_TEXT_BYTES) {
      const id = this.#local.keys().next().value!;
      bytes -= Buffer.byteLength(this.#local.get(id)!.text);
      this.#local.delete(id);
    }
  }
}

function boundedTexts(values: readonly string[], limit: number): string[] {
  const result: string[] = []; const seen = new Set<string>(); let bytes = 0;
  for (const value of values) {
    const text = value.trim();
    if (!text || seen.has(text)) continue;
    const size = Buffer.byteLength(text);
    if (bytes + size > PROMPT_HISTORY_MAX_TEXT_BYTES) continue;
    result.push(text); seen.add(text); bytes += size;
    if (result.length >= limit) break;
  }
  return result;
}
