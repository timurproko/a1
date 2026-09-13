/**
 * Keeps mouse reports and adjacent keyboard input in physical delivery order.
 * ProcessTerminal already frames escape/paste sequences; this also handles hosts
 * that batch reports or split an SGR report after its introducer. Paste payloads
 * are opaque and never interpreted as pointer input.
 */
export class MouseReportInput {
  #pending = "";
  #paste = false;

  constructor(readonly deliver: (data: string) => void) {}

  accept(chunk: string): void {
    const data = this.#pending + chunk;
    this.#pending = "";
    if (this.#paste) {
      const end = data.indexOf("\u001b[201~");
      if (end < 0) { this.deliver(data); return; }
      this.#paste = false;
      this.deliver(data.slice(0, end + 6));
      if (end + 6 < data.length) this.accept(data.slice(end + 6));
      return;
    }
    const pattern = /\u001b\[200~|\u001b\[<\d+;\d+;\d+[Mm]/g;
    let from = 0;
    for (const match of data.matchAll(pattern)) {
      if (match.index > from) this.deliver(data.slice(from, match.index));
      if (match[0] === "\u001b[200~") {
        const end = data.indexOf("\u001b[201~", match.index + 6);
        this.#paste = end < 0;
        this.deliver(data.slice(match.index, end < 0 ? undefined : end + 6));
        if (end >= 0 && end + 6 < data.length) this.accept(data.slice(end + 6));
        return;
      }
      this.deliver(match[0]);
      from = match.index + match[0].length;
    }
    const rest = data.slice(from);
    const partial = /\u001b\[<[\d;]*$/.exec(rest);
    if (partial !== null && partial[0].length <= 64) {
      this.#pending = partial[0];
      if (partial.index > 0) this.deliver(rest.slice(0, partial.index));
    } else if (rest.length > 0) this.deliver(rest);
  }

  reset(): void {
    this.#pending = "";
    this.#paste = false;
  }
}
