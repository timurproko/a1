import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type AgentSessionRuntime,
} from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { createPiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

function controlledSummaryStream(result: Promise<unknown>): {
  stream: unknown;
  push(event: unknown): void;
  end(): void;
} {
  const queue: unknown[] = [];
  const waiters: Array<(value: IteratorResult<unknown>) => void> = [];
  let done = false;
  return {
    stream: {
      result: () => result,
      [Symbol.asyncIterator]() {
        return {
          next: () => queue.length > 0
            ? Promise.resolve({ value: queue.shift(), done: false })
            : done
              ? Promise.resolve({ value: undefined, done: true })
              : new Promise<IteratorResult<unknown>>(resolve => waiters.push(resolve)),
        };
      },
    },
    push(event: unknown) {
      const waiter = waiters.shift();
      if (waiter) waiter({ value: event, done: false });
      else queue.push(event);
    },
    end() {
      done = true;
      for (const waiter of waiters.splice(0)) waiter({ value: undefined, done: true });
    },
  };
}

const usage = {
  input: 10,
  output: 10,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 20,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

describe("pinned AgentSession compaction progress", () => {
  it("publishes zero while authentication is pending, then advances and clears through real compaction", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-compaction-progress-"));
    try {
      const settingsManager = SettingsManager.inMemory({
        compaction: { reserveTokens: 100, keepRecentTokens: 1 },
        retry: { enabled: false },
      });
      const resourceLoader = new DefaultResourceLoader({
        cwd: directory,
        agentDir: directory,
        settingsManager,
        noExtensions: true,
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
        noContextFiles: true,
      });
      await resourceLoader.reload();
      const modelRuntime = await ModelRuntime.create({
        authPath: join(directory, "auth.json"),
        modelsPath: null,
        modelsStorePath: join(directory, "models-store.json"),
        refreshOnCreate: false,
      });
      await modelRuntime.setRuntimeApiKey("openai", "test-key");
      const model = modelRuntime.getModel("openai", "gpt-4o-mini");
      if (!model) throw new Error("Pinned OpenAI test model is unavailable");

      const sessionManager = SessionManager.inMemory(directory);
      sessionManager.appendMessage({ role: "user", content: [{ type: "text", text: "Old request" }], timestamp: 1 });
      sessionManager.appendMessage({
        role: "assistant",
        content: [{ type: "text", text: "Old response" }],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage,
        stopReason: "stop",
        timestamp: 2,
      });
      sessionManager.appendMessage({ role: "user", content: [{ type: "text", text: "Recent request" }], timestamp: 3 });

      const { session } = await createAgentSession({
        cwd: directory,
        agentDir: directory,
        modelRuntime,
        model,
        settingsManager,
        resourceLoader,
        sessionManager,
        noTools: "all",
      });

      const authStarted = deferred<void>();
      const releaseAuth = deferred<void>();
      const authRuntime = modelRuntime as unknown as { getAuth(...args: unknown[]): Promise<unknown> };
      const originalGetAuth = authRuntime.getAuth.bind(modelRuntime);
      authRuntime.getAuth = async (...args: unknown[]) => {
        authStarted.resolve(undefined);
        await releaseAuth.promise;
        return originalGetAuth(...args);
      };

      const completedSummary = {
        role: "assistant",
        content: [{ type: "text", text: "Completed summary" }],
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage,
        stopReason: "stop",
        timestamp: 4,
      };
      const summaryResult = deferred<unknown>();
      const summaryStream = controlledSummaryStream(summaryResult.promise);
      const streamStarted = deferred<void>();
      const streamFunction = vi.fn(async () => {
        streamStarted.resolve(undefined);
        return summaryStream.stream;
      });
      session.agent.streamFunction = streamFunction as unknown as typeof session.agent.streamFunction;

      const adapter = await createPiEngineAdapter({
        cwd: directory,
        agentDir: directory,
        createRuntime: async () => ({
          cwd: directory,
          session,
          diagnostics: [],
          services: { settingsManager, resourceLoader, modelRuntime, diagnostics: [] },
          setRebindSession() {},
          dispose: async () => session.dispose(),
        }) as unknown as AgentSessionRuntime,
      });

      let compacting: ReturnType<typeof session.compact> | undefined;
      try {
        compacting = session.compact();
        await authStarted.promise;
        await adapter.flushEvents();
        expect(streamFunction).not.toHaveBeenCalled();
        expect(adapter.view().status).toMatchObject({ workingMessage: "Compacting", workingProgress: 0 });

        releaseAuth.resolve(undefined);
        await streamStarted.promise;
        summaryStream.push({ type: "text_delta", delta: "s".repeat(2000) });
        await vi.waitFor(async () => {
          await adapter.flushEvents();
          expect(adapter.view().status.workingProgress).toBe(50);
        });

        summaryStream.end();
        summaryResult.resolve(completedSummary);
        await compacting;
        await adapter.flushEvents();

        expect(adapter.view().status).toMatchObject({ workingMessage: null, workingProgress: null });
        expect(sessionManager.getBranch().at(-1)).toMatchObject({ type: "compaction", summary: "Completed summary" });
      } finally {
        releaseAuth.resolve(undefined);
        summaryStream.end();
        summaryResult.resolve(completedSummary);
        await compacting?.catch(() => undefined);
        await adapter.dispose();
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
