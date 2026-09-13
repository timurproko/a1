import type { OwnedUiToolRendering, OwnedUiToolResultPart, OwnedUiTranscriptImageReference } from "../../../contracts/owned-ui/index.js";

const MAX_METADATA_BYTES = 64 * 1024;

/** Copy JSON metadata without diagnostic depth/array truncation or traversing result text/images. */
function renderingJson(value: unknown): unknown {
  let remaining = MAX_METADATA_BYTES;
  const encoded = JSON.stringify(value, function (key, item: unknown) {
    if (key && !Array.isArray(this)) remaining -= jsonStringBytes(key) + 1;
    if (typeof item === "string") remaining -= jsonStringBytes(item);
    else if (item === null || typeof item === "boolean" || typeof item === "number" && Number.isFinite(item)) {
      remaining -= String(item).length;
    } else if (typeof item === "object") remaining -= 2;
    else if (item === undefined) return item;
    else throw new TypeError("unsupported JSON metadata");
    if (--remaining < 0) throw new RangeError("metadata exceeds the supported payload limit");
    return item;
  });
  if (encoded === undefined) throw new TypeError("unsupported JSON metadata");
  if (Buffer.byteLength(encoded) > MAX_METADATA_BYTES) throw new RangeError("metadata exceeds the supported payload limit");
  return JSON.parse(encoded);
}

function jsonStringBytes(value: string): number {
  // Performance: reject very large strings before allocating their escaped representation.
  if (value.length > MAX_METADATA_BYTES) throw new RangeError("metadata exceeds the supported payload limit");
  return Buffer.byteLength(JSON.stringify(value));
}

/** Text lives once on the block; content parts refer to UTF-16 slices or opaque image references. */
export function toolRenderingInput(options: {
  readonly args: unknown;
  readonly previousArgs?: OwnedUiToolRendering | undefined;
  readonly result?: unknown;
  readonly payload: Record<string, unknown>;
  readonly image: (value: unknown) => OwnedUiTranscriptImageReference | undefined;
}): { text: string; toolRendering: OwnedUiToolRendering; imageReferences: readonly OwnedUiTranscriptImageReference[] } {
  const warnings = new Set<string>();
  let args: unknown = {};
  try {
    args = options.args === undefined && options.previousArgs !== undefined
      ? options.previousArgs.arguments : renderingJson(options.args ?? {});
    if (options.args === undefined && options.previousArgs?.unavailable?.includes("Tool arguments unavailable")) {
      warnings.add("Tool arguments unavailable: unsupported or oversized rendering data.");
    }
  } catch { warnings.add("Tool arguments unavailable: unsupported or oversized rendering data."); }

  const imageReferences: OwnedUiTranscriptImageReference[] = [];
  const content: OwnedUiToolResultPart[] = [];
  const texts: string[] = [];
  let length = 0;
  const source = isRecord(options.result) ? options.result : undefined;
  const rawContent = source === undefined ? options.result : source.content;
  const parts = typeof rawContent === "string" ? [{ type: "text", text: rawContent }] : rawContent;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (isRecord(part) && part.type === "text" && typeof part.text === "string") {
        if (texts.length > 0) length++;
        const start = length;
        texts.push(part.text);
        length += part.text.length;
        content.push({ type: "text", start, end: length });
      } else if (isRecord(part) && part.type === "image") {
        const reference = imageReferences.length < 16 ? options.image(part) : undefined;
        if (reference === undefined) warnings.add("Image unavailable: unsupported data or attachment limit exceeded.");
        else {
          content.push({ type: "image", imageIndex: imageReferences.length });
          imageReferences.push(reference);
        }
      } else warnings.add("Tool content unavailable: unsupported content part.");
    }
  } else if (options.result !== undefined) warnings.add("Tool content unavailable: malformed result.");
  let details: unknown;
  if (source?.details !== undefined) {
    try { details = renderingJson(source.details); }
    catch { warnings.add("Tool details unavailable: unsupported or oversized rendering data."); }
  }
  const text = texts.join("\n");
  let toolRendering: OwnedUiToolRendering = {
    arguments: args,
    ...(options.result === undefined ? {} : { result: { content, ...(details === undefined ? {} : { details }) } }),
  };
  const warning = () => [...warnings].join(" ");
  const fits = () => Buffer.byteLength(JSON.stringify({ payload: options.payload, toolRendering: {
    ...toolRendering, ...(warnings.size === 0 ? {} : { unavailable: warning() }),
  } })) <= MAX_METADATA_BYTES;
  if (!fits()) {
    warnings.add("Tool details unavailable: rendering metadata exceeds the supported payload limit.");
    if (toolRendering.result) toolRendering = { ...toolRendering, result: { content } };
  }
  if (!fits()) {
    warnings.add("Tool arguments unavailable: rendering metadata exceeds the supported payload limit.");
    toolRendering = { ...toolRendering, arguments: {} };
  }
  if (!fits()) {
    // Rationale: too many content boundaries exceed the metadata budget; retain text/images with an explicit fallback.
    warnings.add("Tool content boundaries unavailable: rendering metadata exceeds the supported payload limit.");
    toolRendering = { ...toolRendering, result: { content: [
      { type: "text", start: 0, end: text.length },
      ...imageReferences.map((_, imageIndex) => ({ type: "image" as const, imageIndex })),
    ] } };
  }
  if (warnings.size > 0) toolRendering = { ...toolRendering, unavailable: warning() };
  return { text, toolRendering, imageReferences };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
