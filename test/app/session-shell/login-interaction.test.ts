import { describe, expect, it, vi } from "vitest";

const dialogs = vi.hoisted(() => [] as Record<string, ReturnType<typeof vi.fn>>[]);
const selectors = vi.hoisted(() => [] as { choose(label: string): void; cancel(): void }[]);
vi.mock("../../../src/integrations/pi/components/shell-selectors-dialogs.js", () => ({
  createPiShellLoginDialog: (_runtime: unknown, _provider: string, done: (success: boolean) => void) => {
    const dialog = {
      done,
      showAuth: vi.fn(), showDeviceCode: vi.fn(), showWaiting: vi.fn(), showInfo: vi.fn(), showProgress: vi.fn(),
      showPrompt: vi.fn(async () => "typed"), showManualInput: vi.fn(async () => { throw new Error("cancelled"); }),
    };
    dialogs.push(dialog as never);
    return dialog;
  },
  createPiShellExtensionSelector: (_title: string, _labels: string[], choose: (label: string) => void, cancel: () => void) => {
    const selector = { choose, cancel };
    selectors.push(selector);
    return selector;
  },
}));

const { LoginInteraction } = await import("../../../src/app/session-shell/login-interaction.js");

function harness() {
  const surfaces: unknown[] = [];
  const blocked: unknown[] = [];
  const syncProgress = vi.fn();
  const login = new LoginInteraction({
    terminal: { viewport: () => ({ columns: 80, rows: 24 }), requestRender: vi.fn() },
    root: { setInputSurface: vi.fn((surface: unknown) => surfaces.push(surface)) } as never,
    programStatus: { setBlocked: vi.fn((_kind: string, value: unknown) => blocked.push(value)) } as never,
    syncProgress,
  });
  return { login, surfaces, blocked, syncProgress };
}

describe("LoginInteraction", () => {
  it("shows one login dialog, marks authentication blocked, and clears both when it finishes", () => {
    const { login, surfaces, blocked, syncProgress } = harness();
    login.start({ providerId: "p", providerName: "Provider" } as never);
    expect(surfaces.at(-1)).toBe(dialogs.at(-1));
    expect(blocked).toEqual([{ kind: "auth", message: "Log in to Provider" }]);
    login.finish();
    login.finish();
    expect(surfaces.at(-1)).toBeNull();
    expect(blocked.at(-1)).toBeUndefined();
    expect(syncProgress).toHaveBeenCalledTimes(2);
  });

  it("routes engine notifications and prompts through the open dialog only", async () => {
    const { login } = harness();
    await expect(login.requestInput({ type: "prompt", message: "key?" } as never)).resolves.toBeNull();
    login.start({ providerId: "p", providerName: "Provider" } as never);
    const dialog = dialogs.at(-1)!;
    login.notify({ type: "device_code" } as never);
    expect(dialog.showDeviceCode).toHaveBeenCalledOnce();
    expect(dialog.showWaiting).toHaveBeenCalledWith("Waiting for authentication...");
    login.notify({ type: "progress", message: "working" } as never);
    expect(dialog.showProgress).toHaveBeenCalledWith("working");
    await expect(login.requestInput({ type: "prompt", message: "key?" } as never)).resolves.toBe("typed");
    await expect(login.requestInput({ type: "manual-code", message: "code?" } as never)).resolves.toBeNull();
  });

  it("answers a selection with the chosen option id and restores the dialog", async () => {
    const { login, surfaces } = harness();
    login.start({ providerId: "p", providerName: "Provider" } as never);
    const dialog = dialogs.at(-1);
    const answer = login.requestInput({ type: "select", message: "Pick", options: [{ id: "a", label: "Alpha" }] } as never);
    selectors.at(-1)!.choose("Alpha");
    await expect(answer).resolves.toBe("a");
    expect(surfaces.at(-1)).toBe(dialog);
  });

  it("forgets its dialog when the session is replaced", async () => {
    const { login } = harness();
    login.start({ providerId: "p", providerName: "Provider" } as never);
    login.onSessionReplaced();
    await expect(login.requestInput({ type: "prompt", message: "key?" } as never)).resolves.toBeNull();
  });
});
