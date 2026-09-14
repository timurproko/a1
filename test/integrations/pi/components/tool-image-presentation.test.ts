import { getCapabilities, setCapabilities } from "#pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolImagePresentation } from "../../../../src/integrations/pi/components/tool-image-presentation.js";

const caps = getCapabilities();
afterEach(() => setCapabilities(caps));
const image = (data: string, mimeType = "image/jpeg") => ({ type: "image", data, mimeType });
const png = { data: "AQID", mimeType: "image/png" };
function fixture() {
  setCapabilities({ ...caps, images: "kitty" });
  const pending: ((value: typeof png | null) => void)[] = [];
  const convert = vi.fn(() => new Promise<typeof png | null>(resolve => pending.push(resolve)));
  const changed = vi.fn();
  const value = new ToolImagePresentation(changed, convert);
  return { value, changed, convert, pending };
}
const turn = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };

describe("current tool image conversion ownership", () => {
  it("deduplicates repeated chunks and current references without concurrent conversion", async () => {
    const { value, convert, pending, changed } = fixture();
    for (let n = 0; n < 100; n++) value.update([image("AQID"), image("AQID")], true);
    await turn();
    expect(convert).toHaveBeenCalledTimes(1);
    pending.shift()!(png);
    await turn();
    expect(changed).toHaveBeenCalledTimes(1);
    value.update([image("AQID")], true);
    await turn();
    expect(convert).toHaveBeenCalledTimes(1);
    value.dispose();
    expect(value.components(80)).toEqual([]);
  });

  it("discards obsolete completion and converts only the newest queued source", async () => {
    const { value, convert, pending, changed } = fixture();
    value.update([image("AQID")], true);
    await turn();
    for (let n = 0; n < 100; n++) value.update([image(Buffer.from(`image-${n}`).toString("base64"))], true);
    expect(convert).toHaveBeenCalledTimes(1);
    pending.shift()!(png);
    await turn();
    expect(changed).not.toHaveBeenCalled();
    expect(convert).toHaveBeenCalledTimes(2);
    expect(convert).toHaveBeenLastCalledWith(Buffer.from("image-99").toString("base64"), "image/jpeg");
    pending.shift()!(png);
    await turn();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it.each(["removed", "disposed"])("does not publish or retain a %s conversion", async action => {
    const { value, pending, changed } = fixture();
    value.update([image("AQID")], true);
    await turn();
    if (action === "removed") value.update([], true); else value.dispose();
    pending.shift()!(png);
    await turn();
    expect(changed).not.toHaveBeenCalled();
    expect(value.components(80)).toEqual([]);
  });

  it("does not start obsolete deferred work, hidden conversions, or iTerm conversions", async () => {
    const { value, convert } = fixture();
    value.update([image("AQID")], true);
    value.update([], true);
    await turn();
    value.update([image("AQID")], false);
    await turn();
    expect(convert).not.toHaveBeenCalled();
    expect(value.components(80)).toEqual([]);
    setCapabilities({ ...caps, images: "iterm2" });
    value.update([image("AQID")], true);
    await turn();
    expect(convert).not.toHaveBeenCalled();
    expect(value.components(80)).toHaveLength(1);
  });

  it.each(["null", "rejected", "oversized"])("shows one bounded fallback for %s conversion without retry loops", async failure => {
    const changed = vi.fn();
    setCapabilities({ ...caps, images: "kitty" });
    const convert = vi.fn(async () => {
      if (failure === "rejected") throw new Error("private codec diagnostic");
      return failure === "null" ? null : { ...png, data: Buffer.alloc(21 * 1024 * 1024).toString("base64") };
    });
    const value = new ToolImagePresentation(changed, convert);
    value.update([image("AQID")], true);
    await turn();
    const rows = value.components(80).flatMap(component => component.render(80)).join("\n");
    expect(rows).toContain("Image unavailable");
    expect(rows).not.toContain("private codec diagnostic");
    for (let n = 0; n < 100; n++) value.update([image("AQID")], true);
    await turn();
    expect(convert).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
