import { convertToLlm } from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSuggestionFixture, eventResponse, requestBody, responseEvents } from "../../../support/suggestion-provider-fixture.js";

const sockets: SyntheticWebSocket[] = [];
const httpBodies: Record<string, any>[] = [];
let httpOutcome: "success" | "failure" | "cancel" = "success";
let holdSocket = false;
let releaseSocket: (() => void) | undefined;
let fixture: Awaited<ReturnType<typeof createSuggestionFixture>> | undefined;

/** Public WebSocket transport double; exercises pinned provider dispatch, never its private cache. */
class SyntheticWebSocket extends EventTarget {
  readyState = 0;
  readonly bodies: Record<string, any>[] = [];
  constructor(url: string) {
    super();
    expect(url).toContain("suggestion-fixture.invalid");
    sockets.push(this);
    queueMicrotask(() => { this.readyState = 1; this.dispatchEvent(new Event("open")); });
  }
  send(data: string): void {
    this.bodies.push(JSON.parse(data));
    const id = `primary_${this.bodies.length}`;
    const respond = () => setImmediate(() => {
      for (const record of responseEvents("openai-codex-responses", id, "Primary response")) {
        this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(record) }));
      }
    });
    if (holdSocket) releaseSocket = respond;
    else respond();
  }
  close(): void { this.readyState = 3; this.dispatchEvent(new Event("close")); }
}

beforeEach(() => {
  vi.stubEnv("PI_OFFLINE", "1");
  vi.stubGlobal("WebSocket", SyntheticWebSocket);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.url).toContain("suggestion-fixture.invalid");
    httpBodies.push(await requestBody(request));
    if (httpOutcome === "failure") return new Response("synthetic-error", { status: 400 });
    if (httpOutcome === "cancel") return new Promise<Response>((_, reject) => {
      const abort = () => reject(new DOMException("cancelled", "AbortError"));
      if (request.signal.aborted) abort();
      else request.signal.addEventListener("abort", abort, { once: true });
    });
    return eventResponse("openai-codex-responses", "suggestion_sse");
  }));
});
afterEach(async () => {
  await fixture?.dispose(); fixture = undefined;
  sockets.length = 0; httpBodies.length = 0; holdSocket = false; releaseSocket = undefined; httpOutcome = "success";
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
});

describe("Codex suggestion transport isolation", () => {
  it.each(["auto", "websocket", "websocket-cached", "sse"] as const)("preserves main transport %s while dispatching suggestion by SSE", async transport => {
    fixture = await createSuggestionFixture({ provider: "openai-codex" });
    fixture.runtime.session.agent.transport = transport;
    const identity = await fixture.prompt();
    const before = structuredClone(fixture.runtime.session.messages);
    const result = await fixture.adapter.generate({ identity, signal: AbortSignal.timeout(2000) });
    expect(result.outcome).toBe("candidate");
    expect(fixture.runtime.session.agent.transport).toBe(transport);
    expect(fixture.runtime.session.messages).toEqual(before);
    expect(httpBodies).toHaveLength(transport === "sse" ? 2 : 1);
    expect(httpBodies.at(-1)?.prompt_cache_key).toBe(fixture.runtime.session.sessionId);
    if (transport !== "sse") expect(sockets[0]?.bodies).toHaveLength(1);
    await fixture.prompt("Continue the primary task");
    if (transport === "auto" || transport === "websocket-cached") expect(sockets[0]?.bodies[1]?.previous_response_id).toBe("primary_1");
    expect(sockets).toHaveLength(transport === "sse" ? 0 : 1);
  });

  it.each(["success", "failure", "cancel"] as const)("leaves idle primary continuation intact after suggestion %s", async outcome => {
    fixture = await createSuggestionFixture({ provider: "openai-codex" });
    fixture.runtime.session.agent.transport = "auto";
    const identity = await fixture.prompt();
    httpOutcome = outcome;
    const abort = new AbortController();
    const pending = fixture.adapter.generate({ identity, signal: abort.signal });
    if (outcome === "cancel") { await vi.waitFor(() => expect(httpBodies).toHaveLength(1)); abort.abort(); }
    expect((await pending).outcome).toBe(outcome === "success" ? "candidate" : outcome === "failure" ? "failed" : "cancelled");
    expect(sockets[0]?.readyState).toBe(1);
    await fixture.prompt("Continue the primary task");
    expect(sockets).toHaveLength(1);
    expect(sockets[0]?.bodies[1]?.previous_response_id).toBe("primary_1");
    expect(JSON.stringify(sockets[0]?.bodies[1])).not.toContain("NEXT USER INPUT");
  });

  it.each(["success", "failure", "cancel"] as const)("does not acquire or clear a busy primary socket on suggestion %s", async outcome => {
    fixture = await createSuggestionFixture({ provider: "openai-codex" });
    fixture.runtime.session.agent.transport = "auto";
    const identity = await fixture.prompt();
    holdSocket = true;
    const session = fixture.runtime.session;
    const user = { role: "user" as const, content: "Busy primary continuation", timestamp: Date.now() };
    // Concurrency: hold a real provider request on the same session routing ID. No private cache inspection.
    const busy = fixture.modelRuntime.completeSimple(session.model!, {
      systemPrompt: session.agent.state.systemPrompt,
      tools: session.agent.state.tools,
      messages: [...convertToLlm(session.messages), user],
    }, { sessionId: session.sessionId, transport: "auto", reasoning: "high" });
    await vi.waitFor(() => expect(sockets[0]?.bodies).toHaveLength(2));
    httpOutcome = outcome;
    const abort = new AbortController();
    const pending = fixture.adapter.generate({ identity, signal: abort.signal });
    if (outcome === "cancel") { await vi.waitFor(() => expect(httpBodies).toHaveLength(1)); abort.abort(); }
    expect((await pending).outcome).toBe(outcome === "success" ? "candidate" : outcome === "failure" ? "failed" : "cancelled");
    expect(httpBodies[0]?.prompt_cache_key).toBe(session.sessionId);
    expect(sockets).toHaveLength(1);
    expect(sockets[0]?.bodies).toHaveLength(2);
    expect(sockets[0]?.readyState).toBe(1);
    releaseSocket!();
    const response = await busy;
    expect(response.stopReason).toBe("stop");
    holdSocket = false;
    // Protocol: advance this synthetic primary conversation through its public state setter.
    session.agent.state.messages = [...session.messages, user, response];
    await fixture.prompt("Continue after the busy request");
    expect(sockets[0]?.bodies[2]?.previous_response_id).toBe("primary_2");
    expect(JSON.stringify(sockets[0]?.bodies[2])).not.toContain("NEXT USER INPUT");
  });
});
