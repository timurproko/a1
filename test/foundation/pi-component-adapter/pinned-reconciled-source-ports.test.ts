import { Text, type TUI } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ensurePiTheme } from "../../../src/integrations/pi/components/theme.js";
import { CustomEntryComponent } from "../../../src/integrations/pi/components/upstream/components/custom-entry.js";
import { DaxnutsComponent } from "../../../src/integrations/pi/components/upstream/components/daxnuts.js";
import { EarendilAnnouncementComponent } from "../../../src/integrations/pi/components/upstream/components/earendil-announcement.js";
import { FirstTimeSetupComponent } from "../../../src/integrations/pi/components/upstream/components/first-time-setup.js";
import { createMarkdownTransform } from "../../../src/integrations/pi/components/upstream/components/markdown-transform.js";
import { createMermaidMarkdownTransformer } from "../../../src/integrations/pi/components/upstream/components/mermaid.js";

beforeAll(() => { ensurePiTheme(); });

describe("reconciled pinned source ports", () => {
  it("keeps markdown transformer ordering and isolates transformer failures", () => {
    const transform = createMarkdownTransform("assistant", false, [
      value => `${value}-one`,
      () => { throw new Error("isolated"); },
      (value, context) => `${value}-${context.availableWidth}`,
    ]);
    expect(transform("base", 72)).toBe("base-one-72");
  });

  it("preserves Mermaid mode, streaming, thinking, and width guards", () => {
    let mode: "off" | "final" | "streaming" = "off";
    const transform = createMermaidMarkdownTransformer({ getMode: () => mode, theme: ensurePiTheme() });
    const source = "```mermaid\nflowchart LR\nA --> B\n```\n";
    expect(transform(source, { messageType: "assistant", isStreaming: false, availableWidth: 80 })).toBe(source);
    mode = "final";
    expect(transform(source, { messageType: "assistant-thinking", isStreaming: false, availableWidth: 80 })).toBe(source);
    expect(transform(source, { messageType: "assistant", isStreaming: true, availableWidth: 80 })).toBe(source);
    expect(transform(source, { messageType: "assistant", isStreaming: false, availableWidth: 1 })).toBe(source);
    expect(transform(source, { messageType: "assistant", isStreaming: false, availableWidth: 80 })).not.toContain("```mermaid");
  });

  it("renders custom entries and source-equivalent renderer failures", () => {
    const entry = { type: "custom", id: "entry", parentId: null, timestamp: new Date(0).toISOString(), customType: "parity", data: {} } as const;
    const component = new CustomEntryComponent(entry, () => new Text("custom entry", 0, 0));
    expect(component.hasContent()).toBe(true);
    expect(component.render(40).join("\n")).toContain("custom entry");

    const failed = new CustomEntryComponent(entry, () => { throw new Error("renderer boom"); });
    expect(failed.render(80).join("\n")).toContain("[parity] renderer failed: renderer boom");
  });

  it("preserves first-time setup theme preview, analytics choice, submit, and cancellation", () => {
    const preview = vi.fn();
    const submit = vi.fn();
    const cancel = vi.fn();
    const setup = new FirstTimeSetupComponent({ detectedTheme: "dark", onThemePreview: preview, onSubmit: submit, onCancel: cancel });
    expect(setup.render(80).join("\n")).toContain("Pick a theme.");
    setup.handleInput("j");
    expect(preview).toHaveBeenCalledWith("light");
    setup.handleInput("\n");
    expect(setup.render(80).join("\n")).toContain("Opt-in to anonymous usage data sharing?");
    setup.handleInput("j");
    setup.handleInput("\n");
    expect(submit).toHaveBeenCalledWith({ theme: "light", shareAnalytics: false });
    setup.handleInput("\x1b");
    expect(cancel).toHaveBeenCalled();
  });

  it("ports animated Daxnuts rendering and disposal without global renderer mutation", () => {
    vi.useFakeTimers();
    const requestRender = vi.fn();
    const component = new DaxnutsComponent({ requestRender } as unknown as TUI);
    expect(component.render(80)).toHaveLength(25);
    vi.advanceTimersByTime(160);
    expect(requestRender).toHaveBeenCalledTimes(2);
    component.dispose();
    vi.advanceTimersByTime(160);
    expect(requestRender).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("ports the Earendil announcement without package-private optional imagery", () => {
    const frame = new EarendilAnnouncementComponent().render(80).join("\n");
    expect(frame).toContain("pi has joined Earendil");
    expect(frame).toContain("https://mariozechner.at/posts/2026-04-08-ive-sold-out/");
  });
});
