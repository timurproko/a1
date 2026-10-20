import { describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";
import type { PiShellComponentPort } from "../../../src/integrations/pi/components/shell-shared-facade.js";
import { ExtensionSurface } from "../../../src/app/session-shell/extension-surface.js";

function component(name: string) {
  return { render: vi.fn((width: number) => [`${name}@${width}`]), invalidate: vi.fn(), dispose: vi.fn() } as unknown as PiShellComponentPort & {
    render: ReturnType<typeof vi.fn>; invalidate: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn>;
  };
}

describe("ExtensionSurface", () => {
  it("renders widgets by placement with a spacer above the editor and disposes replaced widgets", () => {
    const surface = new ExtensionSurface();
    const first = component("first");
    const second = component("second");
    surface.placeWidget("a", first, "aboveEditor");
    surface.placeWidget("b", component("below"), "belowEditor");
    expect(surface.renderWidgets("aboveEditor", 10)).toEqual(["", "first@10"]);
    expect(surface.renderWidgets("belowEditor", 10)).toEqual(["below@10"]);
    surface.placeWidget("a", first, "aboveEditor");
    expect(first.dispose).not.toHaveBeenCalled();
    surface.placeWidget("a", second, "aboveEditor");
    expect(first.dispose).toHaveBeenCalledOnce();
    surface.placeWidget("a", null, "aboveEditor");
    expect(second.dispose).toHaveBeenCalledOnce();
    expect(surface.renderWidgets("aboveEditor", 10)).toEqual([""]);
  });

  it("disposes a replaced header or footer only when it changes", () => {
    const surface = new ExtensionSurface();
    const header = component("header");
    surface.replaceHeader(header);
    surface.replaceHeader(header);
    expect(header.dispose).not.toHaveBeenCalled();
    surface.replaceHeader(null);
    expect(header.dispose).toHaveBeenCalledOnce();
    const footer = component("footer");
    surface.replaceFooter(footer);
    expect(surface.footer).toBe(footer);
  });

  it("merges extension statuses over the engine's footer statuses", () => {
    const surface = new ExtensionSurface();
    surface.setStatus("lint", "ok");
    surface.setStatus("gone", "x");
    surface.setStatus("gone", undefined);
    const view = { status: { footer: { branch: "main", sessionName: null, availableProviderCount: 2, extensionStatuses: [["lint", "old"], ["git", "clean"]] } } } as unknown as OwnedUiSessionViewModel;
    expect(surface.withStatuses(view).status.footer?.extensionStatuses).toEqual([["lint", "ok"], ["git", "clean"]]);
    expect(surface.statuses()).toEqual(new Map([["lint", "ok"]]));
    const bare = surface.withStatuses({ status: {} } as unknown as OwnedUiSessionViewModel).status.footer;
    expect(bare).toMatchObject({ branch: null, sessionName: null, availableProviderCount: 1 });
  });

  it("resets everything an extension set but keeps its working visibility", () => {
    const surface = new ExtensionSurface();
    const header = component("header");
    const widget = component("widget");
    surface.replaceHeader(header);
    surface.placeWidget("w", widget, "belowEditor");
    surface.setStatus("k", "v");
    surface.setWorking("busy", false);
    surface.invalidate();
    expect(header.invalidate).toHaveBeenCalledOnce();
    expect(widget.invalidate).toHaveBeenCalledOnce();
    surface.reset();
    expect(header.dispose).toHaveBeenCalledOnce();
    expect(widget.dispose).toHaveBeenCalledOnce();
    expect(surface.header).toBeNull();
    expect(surface.statuses().size).toBe(0);
    expect(surface.working).toEqual({ message: undefined, visible: false });
  });
});
