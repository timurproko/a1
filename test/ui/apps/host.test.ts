import { describe, expect, it } from "vitest";
import { UiAppHost, UiAppRegistry, type AppHostSurface, type UiApp } from "../../../src/ui/apps/index.js";
import type { PaneRect } from "../../../src/ui/components/index.js";

const INTERRUPT = String.fromCharCode(3);

interface Recorder {
  readonly surface: AppHostSurface;
  readonly frames: (readonly string[] | null)[];
  readonly failures: { appId: string; error: unknown }[];
  exits: number;
  renders: number;
  size: { width: number; height: number };
}

function recorder(): Recorder {
  const state: Recorder = {
    frames: [],
    failures: [],
    exits: 0,
    renders: 0,
    size: { width: 20, height: 3 },
    surface: {
      size: () => state.size,
      requestRender: () => { state.renders += 1; },
      present: lines => { state.frames.push(lines); },
      reportFailure: (appId, error) => { state.failures.push({ appId, error }); },
      exit: () => { state.exits += 1; },
    },
  };
  return state;
}

function app(id: string, overrides: Partial<UiApp> = {}): UiApp {
  return {
    id,
    render: (rect: PaneRect) => Array.from({ length: rect.height }, (_row, index) => (index === 0 ? id : "")),
    ...overrides,
  };
}

function host(surface: AppHostSurface, apps: readonly UiApp[], closeOnInterrupt = true): UiAppHost {
  const registry = new UiAppRegistry();
  for (const [index, one] of apps.entries()) {
    registry.register({ id: one.id, route: one.id, create: () => apps[index]! });
  }
  return new UiAppHost({ registry, surface, closeOnInterrupt });
}

describe("registering an app", () => {
  it("replaces a known id rather than adding a second app", () => {
    const registry = new UiAppRegistry();
    registry.register({ id: "settings", route: "settings", create: () => app("settings") });
    registry.register({ id: "settings", route: "settings", create: () => app("settings-again") });
    expect(registry.ids()).toEqual(["settings"]);
    expect(registry.get("settings")?.create().id).toBe("settings-again");
  });

  it("refuses a route another app already answers", () => {
    const registry = new UiAppRegistry();
    registry.register({ id: "settings", route: "settings", create: () => app("settings") });
    expect(() => registry.register({ id: "other", route: "settings", create: () => app("other") }))
      .toThrow(/already taken by settings/);
  });

  it("reports an identity nobody registered", () => {
    const state = recorder();
    expect(() => host(state.surface, []).open("missing")).toThrow(/not registered: missing/);
    expect(host(state.surface, []).openRoute("missing")).toBe(false);
  });
});

describe("presenting an app", () => {
  it("presents one app at a time, replacing the first", () => {
    const state = recorder();
    const closed: string[] = [];
    const first = app("first", { onClose: () => closed.push("first") });
    const target = host(state.surface, [first, app("second")]);

    target.open("first");
    expect(target.presented?.id).toBe("first");
    target.open("second");
    expect(target.presented?.id).toBe("second");
    expect(closed).toEqual(["first"]);
  });

  it("re-renders at the size the surface reports now", () => {
    const state = recorder();
    const target = host(state.surface, [app("settings")]);
    target.open("settings");
    expect(state.frames.at(-1)).toHaveLength(3);

    state.size = { width: 20, height: 6 };
    target.render();
    expect(state.frames.at(-1)).toHaveLength(6);
  });

  it("clears the surface when it closes", () => {
    const state = recorder();
    const target = host(state.surface, [app("settings")]);
    target.open("settings");
    target.close();
    expect(state.frames.at(-1)).toBeNull();
    expect(target.isPresenting).toBe(false);
  });
});

describe("input reaching a presented app", () => {
  it("passes on what the app does not consume", () => {
    const state = recorder();
    const target = host(state.surface, [app("settings", { onInput: () => ({ consumed: false }) })]);
    target.open("settings");
    expect(target.handleInput("x").consumed).toBe(false);
  });

  it("lets an app consume the interrupt for its own cancelling", () => {
    const state = recorder();
    const seen: string[] = [];
    const target = host(state.surface, [app("settings", {
      onInput: data => { seen.push(data); return { consumed: true }; },
    })]);
    target.open("settings");
    target.handleInput(INTERRUPT);
    expect(seen).toEqual([INTERRUPT]);
    expect(target.isPresenting).toBe(true);
    expect(state.exits).toBe(0);
  });

  it("arms on one idle interrupt and leaves on the second", () => {
    const state = recorder();
    const target = host(state.surface, [app("settings")]);
    target.open("settings");

    expect(target.handleInput(INTERRUPT).consumed).toBe(true);
    expect(target.interruptArmed).toBe(true);
    expect(state.exits).toBe(0);

    target.handleInput(INTERRUPT);
    expect(state.exits).toBe(1);
    expect(target.isPresenting).toBe(false);
  });

  it("delivers a pointer report and repaints when it is acted on", () => {
    const state = recorder();
    const seen: number[] = [];
    const target = host(state.surface, [app("settings", {
      onMouse: event => { seen.push(event.row); return { consumed: true }; },
    })]);
    target.open("settings");
    const before = state.frames.length;
    target.handleMouse({ kind: "press", button: 0, column: 4, row: 2 });
    expect(seen).toEqual([2]);
    expect(state.frames.length).toBeGreaterThan(before);
  });
});

describe("an app that fails", () => {
  it("is closed with the surface restored when its render throws", () => {
    const state = recorder();
    const target = host(state.surface, [app("broken", { render: () => { throw new Error("render blew up"); } })]);
    target.open("broken");
    expect(target.isPresenting).toBe(false);
    expect(state.frames.at(-1)).toBeNull();
    expect(state.failures.at(-1)?.appId).toBe("broken");
  });

  it("is closed when its input handler throws", () => {
    const state = recorder();
    const target = host(state.surface, [app("broken", { onInput: () => { throw new Error("input blew up"); } })]);
    target.open("broken");
    expect(target.isPresenting).toBe(true);
    target.handleInput("x");
    expect(target.isPresenting).toBe(false);
    expect(state.failures.at(-1)?.appId).toBe("broken");
  });
});
