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
} from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { createTuiFacade, validatedAssistantMessage } from "../../../../src/integrations/pi/components/index.js";
import { PRODUCT_IDENTITY } from "../../../../src/product-identity.js";

let root: string | undefined;
afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("Pi public component upgrade conformance", () => {
  it("keeps the reused public component constructors and their render contracts", async () => {
    root = await mkdtemp(join(tmpdir(), `${PRODUCT_IDENTITY.filesystem.temporaryPrefix}pi-components-`));
    initTheme("dark", false);
    for (const constructor of [UserMessageComponent, AssistantMessageComponent, ToolExecutionComponent, ExtensionSelectorComponent,
      LoginDialogComponent, ModelSelectorComponent, SettingsSelectorComponent, ThemeSelectorComponent, ThinkingSelectorComponent,
      UserMessageSelectorComponent]) expect(constructor).toBeTypeOf("function");

    const width = 80;
    const assistant = validatedAssistantMessage({
      id: "assistant-1", kind: "assistant", status: "finalized", text: "hello from Pi", title: null, revision: 1,
      payload: { provider: "openai", model: "gpt-5" },
    });
    const tui = createTuiFacade({ getColumns: () => width, getRows: () => 24, requestRender() {} });
    const rendered = [
      new UserMessageComponent("hello").render(width),
      new AssistantMessageComponent(assistant, false).render(width),
      new ToolExecutionComponent("read", "tool-1", { path: "README.md" }, undefined, undefined, tui, root).render(width),
    ];
    for (const rows of rendered) expect(rows.length).toBeGreaterThan(0);
  });
});
