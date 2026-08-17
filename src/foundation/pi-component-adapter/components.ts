import {
  AssistantMessageComponent,
  ToolExecutionComponent,
  UserMessageComponent,
} from "@earendil-works/pi-coding-agent";
import type { OwnedUiTranscriptBlock } from "../owned-ui-contracts/index.js";
import { createTuiFacade, validatedAssistantMessage } from "./shell-components.js";
import { ensurePiTheme } from "./theme.js";

export function adaptPiUserMessage(block: OwnedUiTranscriptBlock, width: number): readonly string[] {
  requireBlock(block, "user");
  ensurePiTheme();
  return new UserMessageComponent(block.text).render(width);
}

export function adaptPiAssistantMessage(block: OwnedUiTranscriptBlock, width: number): readonly string[] {
  requireBlock(block, "assistant");
  ensurePiTheme();
  return new AssistantMessageComponent(validatedAssistantMessage(block), false).render(width);
}

export function adaptPiToolExecution(
  block: OwnedUiTranscriptBlock,
  width: number,
  cwd: string,
): readonly string[] {
  if (block.kind !== "tool-call" && block.kind !== "tool-result") {
    throw new TypeError("Pi tool execution adaptation requires a tool block");
  }
  ensurePiTheme();
  const payload = blockPayload(block);
  const toolCallId = stringPayload(payload, "toolCallId") ?? block.id;
  const toolName = stringPayload(payload, "toolName") ?? block.title ?? "tool";
  const args = isRecord(payload.arguments) && "json" in payload.arguments ? payload.arguments.json : {};
  const component = new ToolExecutionComponent(
    toolName,
    toolCallId,
    args,
    undefined,
    undefined,
    createTuiFacade({ getColumns: () => width, getRows: () => 24, requestRender() {} }),
    cwd,
  );
  if (block.status === "live") component.markExecutionStarted();
  component.setArgsComplete();
  if (block.kind === "tool-result") {
    component.updateResult({
      content: [{ type: "text", text: block.text }],
      isError: payload.isError === true,
    });
  }
  return component.render(width);
}

function requireBlock(block: OwnedUiTranscriptBlock, kind: OwnedUiTranscriptBlock["kind"]): void {
  if (block.kind !== kind) throw new TypeError(`Pi component adaptation requires ${kind}, received ${block.kind}`);
}

function blockPayload(block: OwnedUiTranscriptBlock): Record<string, unknown> {
  return isRecord(block.payload) ? block.payload : {};
}

function blockProvider(block: OwnedUiTranscriptBlock): string {
  return stringPayload(blockPayload(block), "provider") ?? "openai";
}

function blockModel(block: OwnedUiTranscriptBlock): string {
  return stringPayload(blockPayload(block), "model") ?? "gpt-5";
}

function stringPayload(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
