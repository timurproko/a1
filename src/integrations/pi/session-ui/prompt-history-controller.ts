import { randomUUID } from "node:crypto";
import { PROMPT_HISTORY_MAX_TEXT_BYTES, type PromptHistoryKind, type PromptHistoryPort, type PromptHistorySnapshot } from "../../../contracts/owned-ui/index.js";
import type { PiShellEditorPort } from "../components/index.js";

/** Merges bounded recall snapshots; the editor alone owns browsing, draft, cursor, and undo state. */
export class PromptHistoryController {
  readonly #local = new Map<string, { text: string; committed: boolean }>();
  readonly #unsubscribe: Array<() => void>;
  #snapshot: PromptHistorySnapshot;
  #fallback: string[];
  #rehydrateCache: Map<string, string>;
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
    /** Applied to every recall text before it enters the editor recall list. Callers use this
     * to re-classify durable chip content back into atomic chips; the identity map returned by
     * default keeps historical behavior for callers that opt out. */
    rehydrate?: (text: string) => string;
  }) {
    if (options.editor.recall === undefined) throw new Error("The selected editor does not expose typed history");
    this.#snapshot = { revision: 0, limit: options.limit, entries: [] };
    this.#rehydrateCache = new Map();
    this.#fallback = boundedTexts([...options.fallback].reverse(), options.limit);
    this.#unsubscribeSnapshot = this.#subscribeSnapshot();
    this.#unsubscribeFailure = options.store.onFailure(() => {
      if (this.#disposed) this.#closeFailed = true;
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
    }).catch(() => { /* Security: background storage cannot publish user notifications. Local recall remains honest. */ });
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
    const local = [...this.#local.values()].reverse().map(item => item.text);
    const saved = this.#snapshot.entries.map(item => item.text);
    const values = this.#rehydrateAll(local.concat(saved, this.#fallback));
    this.options.editor.recall!.replace(boundedTexts(values, this.#snapshot.limit));
    this.options.render();
  }

  #rehydrateAll(values: readonly string[]): string[] {
    const rehydrate = this.options.rehydrate;
    if (rehydrate === undefined) return [...values];
    const cache = this.#rehydrateCache;
    const results: string[] = [];
    for (const value of values) {
      const cached = cache.get(value);
      if (cached !== undefined) { results.push(cached); continue; }
      const rendered = rehydrate(value);
      cache.set(value, rendered);
      results.push(rendered);
    }
    if (cache.size > 512) {
      // Performance: keep the cache bounded so long sessions cannot grow it without limit.
      const keys = [...cache.keys()].slice(0, cache.size - 256);
      for (const key of keys) cache.delete(key);
    }
    return results;
  }

  reset(fallback: readonly string[]): void {
    this.#generation++;
    this.#unsubscribeSnapshot();
    this.#unsubscribeSnapshot = this.#subscribeSnapshot();
    this.#fallback = boundedTexts([...fallback].reverse(), this.options.limit);
    this.#local.clear();
    this.#rehydrateCache.clear();
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
        if (entry.committed || snapshot.entries.some(saved => saved.submissionId === id)) this.#local.delete(id);
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
