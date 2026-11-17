import { retainPromptChipSource } from "./presentation-source.js";
import { textSequences } from "./text.js";

const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/gu;
const SGR = /^\u001b\[[0-9;:]*m$/u;
const PRIVATE_SOURCE = /^\u001b\]a1;(?:chip-source;[^\u0007\u001b]*|\/chip-source|emoji-vs16)\u0007$/u;
const PROMPT_ZONE = /^\u001b\]133;[ABC](?:\u0007|\u001b\\)$/u;

function safeSequence(sequence: string): boolean {
  if (SGR.test(sequence) || PRIVATE_SOURCE.test(sequence)) return true;
  const body = sequence.slice(2, sequence.endsWith("\u0007") ? -1 : -2);
  // Images and OSC links are opaque transports, not commands to execute as row content.
  return !/[\u0000-\u001f\u007f-\u009f]/u.test(body)
    && (sequence.startsWith("\u001b_G") || sequence.startsWith("\u001b]1337;File=")
      || /^\u001b\]8;[^;]*;/u.test(sequence));
}

function visibleControl(control: string): string {
  const code = control.charCodeAt(0);
  const display = code === 9 ? "   " : code === 127 ? "␡" : code < 32 ? String.fromCharCode(0x2400 + code) : "�";
  return retainPromptChipSource(display, control);
}

/**
 * Makes one owned transcript row inert without losing its source for selection copy. Tabs use
 * the same three space cells as shared geometry; other controls get a visible, source-backed label.
 * Supported formatting, copy metadata, and one-shot image transports remain byte-identical.
 */
export function normalizeTranscriptRow(row: string): string {
  if (!/[\u0000-\u001f\u007f-\u009f]/u.test(row)) return row;
  let output = "", cursor = 0;
  for (const sequence of textSequences(row)) {
    const index = row.indexOf(sequence, cursor);
    output += row.slice(cursor, index).replace(CONTROLS, visibleControl);
    output += PROMPT_ZONE.test(sequence) ? "" : safeSequence(sequence) ? sequence : retainPromptChipSource("�", sequence);
    cursor = index + sequence.length;
  }
  return output + row.slice(cursor).replace(CONTROLS, visibleControl);
}
