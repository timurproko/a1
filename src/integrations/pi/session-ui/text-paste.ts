/** Normalize clipboard text and classify its compact label using the pinned Pi 0.84.2 paste policy. */
export function prepareTextPaste(source: string): { readonly text: string; readonly label?: string } {
  // Compatibility: extended-key terminals can encode literal controls inside bracketed paste.
  const decoded = source.replace(/\x1b\[(\d+);5u/g, (sequence: string, value: string) => {
    const code = Number(value);
    if (code >= 65 && code <= 90) return String.fromCharCode(code - 64);
    if (code >= 97 && code <= 122) return String.fromCharCode(code - 96);
    return sequence;
  });
  const text = decoded.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").replace(/[\x00-\x09\x0b-\x1f]/g, "");
  const lines = text.split("\n").length;
  const label = lines > 10 ? `+${lines} lines` : text.length > 1000 ? `${text.length} chars` : undefined;
  return { text, ...(label === undefined ? {} : { label }) };
}
