import type { OwnedUiEvent, OwnedUiSessionBackend, OwnedUiSessionNameState, OwnedUiSessionNamingPort } from "../../contracts/owned-ui/index.js";
import { generateSessionName } from "./generate.js";

export interface SessionNamingContext {
  readonly cwd: string;
  readonly branch: string | null;
  readonly revision: string;
}

interface NamingOptions {
  readonly backend: Pick<OwnedUiSessionBackend, "identity" | "session">;
  readonly naming: OwnedUiSessionNamingPort;
  /** Executes the synchronous callback under authoritative repository-context coordination. */
  readonly withContext: <T>(consume: (context: SessionNamingContext) => T, signal: AbortSignal) => Promise<T>;
  readonly enabled: () => boolean;
}

interface PromptRun {
  readonly epoch: number;
  readonly abort: AbortController;
  context?: SessionNamingContext;
  state?: OwnedUiSessionNameState;
  prompt?: string;
  checking?: boolean;
}

function contextKey(context: SessionNamingContext): string {
  return JSON.stringify([context.cwd.replace(/\\/g, "/"), context.branch, context.revision]);
}

/** One background naming chain per eligible prompt/context; owns no timers or engine objects. */
export class SessionNamingController {
  readonly #options: NamingOptions;
  readonly #unsubscribe: () => void;
  #binding: number;
  #seen = new Set<string>();
  #signature: string | undefined;
  #epoch = 0;
  #run: PromptRun | undefined;
  #work: { readonly abort: AbortController; readonly key: string } | undefined;
  #attempted: string | undefined;
  #disposed = false;

  constructor(options: NamingOptions) {
    this.#options = options;
    this.#binding = options.backend.identity.sessionBindingGeneration;
    this.#rememberTranscript();
    this.#unsubscribe = options.backend.session.onEvent(event => this.#event(event));
  }

  settingsChanged(): void { if (!this.#options.enabled()) this.#invalidate(); }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    this.#invalidate();
  }

  #invalidate(): void {
    this.#epoch++;
    this.#attempted = undefined;
    this.#run?.abort.abort();
    this.#run = undefined;
    this.#work?.abort.abort();
    this.#work = undefined;
  }

  #rememberTranscript(): void {
    this.#seen = new Set(this.#options.backend.session.view().transcript.filter(block => block.kind === "user").map(block => block.id));
  }

  #event(event: OwnedUiEvent): void {
    if (this.#disposed) return;
    const { backend } = this.#options;
    if (this.#binding !== backend.identity.sessionBindingGeneration) {
      this.#binding = backend.identity.sessionBindingGeneration;
      this.#invalidate();
      this.#attempted = undefined;
      this.#signature = undefined;
      this.#rememberTranscript();
    }
    if (event.type === "session-view") {
      const footer = event.view.status.footer;
      const signature = JSON.stringify([footer?.repositoryPath, footer?.branch, footer?.repositoryRevision]);
      if (this.#signature !== undefined && signature !== this.#signature) this.#checkContext();
      this.#signature = signature;
      if (this.#run) for (const block of event.view.transcript) if (block.kind === "user") this.#prompt(block.id, block.text);
    }
    if (event.type === "agent-run-started") {
      this.#run?.abort.abort();
      const run: PromptRun = { epoch: this.#epoch, abort: new AbortController() };
      this.#run = run;
      if (!this.#options.enabled()) return;
      const state = this.#options.naming.state();
      if (!state) return;
      run.state = state;
      void this.#options.withContext(context => context, run.abort.signal).then(context => {
        if (this.#run !== run || run.epoch !== this.#epoch || run.abort.signal.aborted
          || state.binding !== backend.identity.sessionBindingGeneration) return;
        run.context = context;
        if (this.#work && this.#work.key !== contextKey(context)) {
          this.#work.abort.abort();
          this.#work = undefined;
        }
        this.#launch(run);
      }).catch(() => {});
      for (const block of backend.session.view().transcript) if (block.kind === "user") this.#prompt(block.id, block.text);
    }
    if (event.type === "transcript-block" && event.block.kind === "user") this.#prompt(event.block.id, event.block.text);
    if (event.type === "agent-run-settled" && this.#run?.prompt === undefined) {
      this.#run?.abort.abort();
      this.#run = undefined;
    }
    if (event.type === "session-lifecycle" && ["stopping", "stopped", "failed"].includes(event.lifecycle)) this.#invalidate();
  }

  #checkContext(): void {
    const run = this.#run;
    if (!run) return;
    run.checking = true;
    void this.#options.withContext(context => context, run.abort.signal).then(current => {
      if (this.#run !== run || run.abort.signal.aborted || this.#disposed) return;
      if (run.context && contextKey(current) !== contextKey(run.context)) { this.#invalidate(); return; }
      run.checking = false;
      this.#launch(run);
    }).catch(() => {});
  }

  #prompt(id: string, text: string): void {
    if (this.#seen.has(id)) return;
    this.#seen.add(id);
    const run = this.#run;
    if (!run || !text.trim() || text.trimStart().startsWith("/")) return;
    run.prompt = text.trim();
    this.#launch(run);
  }

  #launch(run: PromptRun): void {
    const { context, state, prompt } = run;
    if (!context || !state || !prompt || run.checking || this.#disposed || !this.#options.enabled()
      || run.abort.signal.aborted || run.epoch !== this.#epoch || state.source === "user") return;
    const repositoryKey = contextKey(context);
    const key = JSON.stringify([state.sessionFile, repositoryKey]);
    if (state.completedContext === key || this.#attempted === key || this.#work) return;
    this.#attempted = key;
    const work = new AbortController();
    this.#work = { abort: work, key: repositoryKey };
    void generateSessionName(prompt, `${context.cwd.split(/[\\/]/).at(-1) ?? ""} (${context.branch ?? "no branch"})`,
      request => this.#options.naming.complete(request), work.signal).then(name => {
      if (work.signal.aborted || this.#disposed || !this.#options.enabled()) return;
      return this.#options.withContext(current => {
        if (contextKey(current) !== repositoryKey || work.signal.aborted || this.#disposed || !this.#options.enabled()) return false;
        return this.#options.naming.apply(state, name, key);
      }, work.signal);
    }).catch(() => {}).finally(() => { if (this.#work?.abort === work) this.#work = undefined; });
  }
}
