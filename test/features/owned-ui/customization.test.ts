import { describe, expect, it } from "vitest";
import type { OwnedUiCustomization, OwnedUiSlotId } from "../../../src/contracts/owned-ui/index.js";
import {
  createVanillaUiCustomizationRegistry,
  OwnedCommandSurface,
  OwnedUiCustomizationRegistry,
} from "../../../src/features/owned-ui/index.js";

const slots: readonly OwnedUiSlotId[] = [
  "theme",
  "transcript-block",
  "tool-card",
  "editor",
  "status",
  "command",
  "selector",
  "dialog",
  "overlay",
  "layout",
];

function customization(slot: OwnedUiSlotId, id: string, precedence = 0, version = 1): OwnedUiCustomization {
  return { id, slot, version, precedence, label: id, payload: {} };
}

describe("owned UI customization registry", () => {
  it("provides a vanilla preset for every stable slot", () => {
    const registry = createVanillaUiCustomizationRegistry({
      renderTranscriptBlock: (block, width) => [`${block.kind}:${width}`],
    });
    for (const slot of slots.filter(slot => slot !== "command")) {
      expect(registry.resolve(slot)?.customization.id).toBe(`vanilla-${slot === "transcript-block" ? "transcript" : slot === "tool-card" ? "tool-card" : slot === "layout" ? "fullscreen" : slot}`);
    }
    expect(registry.resolve("transcript-block")?.implementation.render?.({ kind: "assistant" }, 42)).toEqual(["assistant:42"]);
  });

  it("resolves precedence and version without leaking registrations across slots", () => {
    const registry = new OwnedUiCustomizationRegistry();
    registry.register(customization("theme", "base", 0), { payload: { color: "blue" } });
    registry.register(customization("theme", "bright", 100), { payload: { color: "cyan" } });
    registry.register(customization("status", "busy", 100), { payload: { spinner: true } });

    expect(registry.resolve("theme")?.customization.id).toBe("bright");
    expect(registry.resolve("status")?.customization.id).toBe("busy");
    expect(registry.resolve("editor")).toBeUndefined();
    expect(registry.registrations("theme").map(value => value.id)).toEqual(["bright", "base"]);
  });

  it("supports replacement rollback and rejects invalid slots and malformed customizations", () => {
    const registry = new OwnedUiCustomizationRegistry();
    const first = customization("editor", "main", 0, 1);
    const second = customization("editor", "main", 10, 2);
    registry.register(first, { payload: "first" });
    registry.register(second, { payload: "second" });
    expect(registry.resolve("editor")?.implementation.payload).toBe("second");
    expect(registry.remove("main")).toBe(true);
    expect(registry.resolve("editor")).toBeUndefined();
    expect(() => registry.register({ ...customization("editor", "bad"), slot: "future" as never }, { payload: {} })).toThrow(/slot/);
    expect(() => registry.register(customization("editor", "bad-payload"), null as never)).toThrow(/implementation/);
  });

  it("installs command slots into a session-bound command surface", async () => {
    const registry = new OwnedUiCustomizationRegistry();
    registry.register(customization("command", "abort-current"), {
      payload: {},
      createCommand: context => ({
        type: "abort",
        correlationId: context.correlationId,
        sessionId: context.sessionId,
      }),
    });
    const surface = new OwnedCommandSurface();
    expect(registry.installCommands(surface, "session-1")).toEqual(["abort-current"]);
    await expect(surface.dispatch("abort-current", "session-1")).resolves.toMatchObject({ type: "abort", sessionId: "session-1" });
    await expect(surface.dispatch("abort-current", "session-2")).rejects.toThrow(/does not match/);
  });
});
