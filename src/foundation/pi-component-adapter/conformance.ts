import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AssistantMessageComponent,
  initTheme,
  ToolExecutionComponent,
  UserMessageComponent,
  VERSION,
} from "@earendil-works/pi-coding-agent";
import { OWNED_UI_CONTRACT_VERSION } from "../owned-ui-contracts/index.js";

export interface PiComponentConformanceResult {
  readonly component: "user-message" | "assistant-message" | "tool-execution";
  readonly renderRows: number;
  readonly width: number;
}

export interface PiComponentConformanceReport {
  readonly packageName: "@earendil-works/pi-coding-agent";
  readonly packageVersion: string;
  readonly ownedUiContractVersion: number;
  readonly componentResults: readonly PiComponentConformanceResult[];
}

export class PiComponentConformanceError extends Error {
  constructor(readonly stage: "theme" | "components", cause: unknown) {
    super(`Pi component conformance failed during ${stage}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = "PiComponentConformanceError";
  }
}

export async function runPiComponentConformance(): Promise<PiComponentConformanceReport> {
  const root = await mkdtemp(join(tmpdir(), "addone-pi-components-"));
  try {
    try {
      initTheme("dark", false);
    } catch (error) {
      throw new PiComponentConformanceError("theme", error);
    }

    try {
      const width = 80;
      const user = new UserMessageComponent("hello from AddOne");
      const assistantMessage = {
        role: "assistant",
        content: [{ type: "text", text: "hello from Pi" }],
        api: "openai-responses",
        provider: "openai",
        model: "gpt-5",
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "stop",
        timestamp: Date.now(),
      };
      const assistant = new AssistantMessageComponent(assistantMessage as never, false);
      const tool = new ToolExecutionComponent(
        "read",
        "tool-1",
        { path: "README.md" },
        undefined,
        undefined,
        {} as never,
        root,
      );
      const componentResults: PiComponentConformanceResult[] = [
        { component: "user-message", renderRows: user.render(width).length, width },
        { component: "assistant-message", renderRows: assistant.render(width).length, width },
        { component: "tool-execution", renderRows: tool.render(width).length, width },
      ];
      if (componentResults.some(result => result.renderRows <= 0)) {
        throw new Error("a public component produced no render rows");
      }
      return {
        packageName: "@earendil-works/pi-coding-agent",
        packageVersion: VERSION,
        ownedUiContractVersion: OWNED_UI_CONTRACT_VERSION,
        componentResults,
      };
    } catch (error) {
      if (error instanceof PiComponentConformanceError) throw error;
      throw new PiComponentConformanceError("components", error);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
