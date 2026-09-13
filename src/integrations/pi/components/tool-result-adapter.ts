import type { ToolExecutionComponent } from "@earendil-works/pi-coding-agent";
import type { OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import { isRecord, type PiShellImageAssetResolver } from "./shell-shared-facade.js";

/** Reconstruct public Pi inputs once at the component boundary, never from diagnostic summaries. */
export function updatePiToolResult(component: ToolExecutionComponent, block: OwnedUiTranscriptBlock, assets?: PiShellImageAssetResolver): void {
  const payload = isRecord(block.payload) ? block.payload : {};
  if (block.kind !== "tool-result" && payload.partialResult !== true) return;
  type Result = Parameters<ToolExecutionComponent["updateResult"]>[0];
  const image = (index: number): Result["content"][number] => {
    const reference = block.imageReferences?.[index];
    const asset = reference === undefined ? null : assets?.resolve(reference.assetId);
    return asset == null
      ? { type: "text", text: `[Image unavailable: ${reference?.mimeType ?? "unknown"}]` }
      : { type: "image", data: asset.data, mimeType: asset.mimeType };
  };
  const result = block.toolRendering?.result;
  const content: Result["content"] = result === undefined
    ? [{ type: "text", text: block.text }, ...(block.imageReferences ?? []).map((_, index) => image(index))]
    : result.content.map(part => part.type === "text"
      ? { type: "text", text: block.text.slice(part.start, part.end) } : image(part.imageIndex));
  component.updateResult({ content, details: result?.details, isError: payload.isError === true }, block.status === "live");
}

export function piToolArguments(block: OwnedUiTranscriptBlock): unknown {
  if (block.toolRendering !== undefined) return block.toolRendering.arguments;
  // Compatibility: existing owned blocks and component consumers may lack rendering metadata.
  const payload = isRecord(block.payload) ? block.payload : {};
  return isRecord(payload.arguments) && "json" in payload.arguments ? payload.arguments.json : payload.arguments ?? {};
}
