import { describe, expect, it } from "vitest";
import { UnixHostTerminalAdapter } from "../../src/host-terminal/unix.js";

describe("Unix host terminal adapter", () => {
  it.each(["linux", "darwin"] as const)("acquires and restores raw mode without publishing a startup screen on %s", platform => {
    const rawTransitions: boolean[] = [];
    const input = { isTTY: true, isRaw: false, setRawMode: (enabled: boolean) => { rawTransitions.push(enabled); input.isRaw = enabled; } };
    let output = "";
    const adapter = new UnixHostTerminalAdapter(input, { write: value => { output += String(value); return true; } }, platform);
    const captured = adapter.capture();
    adapter.enter();
    adapter.enter();
    expect(rawTransitions).toEqual([true]);
    expect(output.match(/\x1b\[\?1049h/g) ?? []).toHaveLength(0);
    expect(output).not.toContain("\x1b[2J");
    expect(output).not.toContain("\x1b[?1003h");

    expect(adapter.decode(Buffer.from("π"))).toMatchObject([{ type: "key", text: "π" }]);
    expect(adapter.decode(Buffer.from("\x1b[200~a\nb\x1b[201~"))).toEqual([{ type: "paste", text: "a\nb" }]);
    expect(adapter.decode(Buffer.from("\x1b[I"))).toEqual([{ type: "focus", focused: true }]);

    adapter.restore(captured);
    adapter.restore(captured);
    expect(rawTransitions).toEqual([true, false]);
    expect(output.match(/\x1b\[\?1049l/g) ?? []).toHaveLength(0);
  });
});
