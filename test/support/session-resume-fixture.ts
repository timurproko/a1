import { SessionManager } from "@earendil-works/pi-coding-agent";

/** Fresh offline history persisted by the same public Pi API used in production. */
export async function writeResumeFixture(directory: string, cwd: string, options: {
  readonly compacted?: boolean;
} = {}): Promise<{ path: string; id: string; marker: string }> {
  const manager = SessionManager.create(cwd, directory);
  const id = manager.getSessionId();
  const marker = `resume-proof-${id}`;
  const assistant = (text: string) => manager.appendMessage({
    role: "assistant", content: [{ type: "text", text }], api: "openai-responses", provider: "openai", model: "gpt-5",
    usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "stop", timestamp: 2,
  });
  manager.appendModelChange("openai", "gpt-5");
  manager.appendThinkingLevelChange("high");
  if (options.compacted) {
    manager.appendMessage({ role: "user", content: "Earlier archived question", timestamp: 1 });
    assistant("Earlier archived answer");
  }
  const kept = manager.appendMessage({ role: "user", content: marker, timestamp: 3 });
  if (options.compacted) manager.appendCompaction("Saved resume checkpoint", kept, 1000);
  assistant(`Restored ${marker}`);
  const path = manager.getSessionFile();
  if (!path) throw new Error("Pi did not assign the disposable session file");
  return { path, id, marker };
}
