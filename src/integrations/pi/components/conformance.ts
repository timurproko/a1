import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AssistantMessageComponent,
  ExtensionSelectorComponent,
  initTheme,
  LoginDialogComponent,
  ModelSelectorComponent,
  SettingsSelectorComponent,
  ThemeSelectorComponent,
  ThinkingSelectorComponent,
  ToolExecutionComponent,
  UserMessageComponent,
  UserMessageSelectorComponent,
  VERSION,
} from "@earendil-works/pi-coding-agent";
import { OWNED_UI_CONTRACT_VERSION, type OwnedUiTranscriptBlock } from "../../../foundation/owned-ui-contracts/index.js";
import { createTuiFacade, validatedAssistantMessage } from "./shell-components.js";
import { PRODUCT_IDENTITY } from "../../../product-identity.js";

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
  readonly componentFamilies: readonly string[];
}

export class PiComponentConformanceError extends Error {
  constructor(readonly stage: "theme" | "components", cause: unknown) {
    super(`Pi component conformance failed during ${stage}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = "PiComponentConformanceError";
  }
}

export async function runPiComponentConformance(): Promise<PiComponentConformanceReport> {
  const root = await mkdtemp(join(tmpdir(), `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}pi-components-`));
  try {
    try {
      initTheme("dark", false);
    } catch (error) {
      throw new PiComponentConformanceError("theme", error);
    }

    try {
      const width = 80;
      const publicConstructors = [UserMessageComponent, AssistantMessageComponent, ToolExecutionComponent, ExtensionSelectorComponent,
        LoginDialogComponent, ModelSelectorComponent, SettingsSelectorComponent, ThemeSelectorComponent, ThinkingSelectorComponent,
        UserMessageSelectorComponent];
      if (publicConstructors.some(constructor => typeof constructor !== "function")) throw new Error("a reused public component constructor is missing");
      const user = new UserMessageComponent(`hello from ${PRODUCT_IDENTITY.displayName}`);
      const assistantBlock: OwnedUiTranscriptBlock = {
        id: "assistant-1",
        kind: "assistant",
        status: "finalized",
        text: "hello from Pi",
        title: null,
        revision: 1,
        payload: { provider: "openai", model: "gpt-5" },
      };
      const assistant = new AssistantMessageComponent(validatedAssistantMessage(assistantBlock), false);
      const tool = new ToolExecutionComponent(
        "read",
        "tool-1",
        { path: "README.md" },
        undefined,
        undefined,
        createTuiFacade({ getColumns: () => width, getRows: () => 24, requestRender() {} }),
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
        componentFamilies: ["messages", "tool-execution", "selectors", "dialogs", "editor-autocomplete", "footer-status", "extension-surfaces"],
      };
    } catch (error) {
      if (error instanceof PiComponentConformanceError) throw error;
      throw new PiComponentConformanceError("components", error);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
