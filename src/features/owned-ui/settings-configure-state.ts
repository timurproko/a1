import type { DialogPointer, LineInput } from "../../ui/components/index.js";
import type { OwnedUiSettingsEntry } from "../../ui/settings/index.js";

/** A configure workflow's editable record and keyboard selection, independent from its pointer viewport. */
export interface StructuredEdit {
  readonly entry: OwnedUiSettingsEntry;
  readonly pointer: DialogPointer<number>;
  windowStart: number;
  readonly flags: readonly string[];
  readonly modelDialog: "thinking" | "default" | null;
  readonly filter: LineInput | null;
  step: "model" | "level";
  modelKey: string | null;
  modelIndex: number;
  index: number;
  error: string | null;
  readonly record: Record<string, boolean | string>;
}
