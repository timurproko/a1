import { EventEmitter } from "node:events";
import { getKeybindings, stripTerminalSequences, visibleWidth, getOsc8LinkAtColumn } from "@earendil-works/pi-tui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const effects = vi.hoisted(() => ({ copy: vi.fn(async (_value: string) => {}), spawn: vi.fn() }));
vi.mock("../../../../src/integrations/pi/startup-public.js", async original => ({
  ...await original<object>(), copyToClipboard: effects.copy,
}));
vi.mock("node:child_process", async original => ({ ...await original<object>(), spawn: effects.spawn }));
import { applyPiTheme, createPiShellLoginDialog, piTheme, setPiAccentColor } from "../../../../src/integrations/pi/components/index.js";
import { cellStyle } from "../../../support/ansi-cell-style.js";

const plain = (rows: readonly string[]) => rows.map(row => stripTerminalSequences(row).trimEnd());
async function fixture(name = "Xiaomi Token Plan SGP", standard = true) {
  const complete = vi.fn();
  const requestRender = vi.fn();
  const dialog = createPiShellLoginDialog({ getColumns: () => 80, getRows: () => 24, requestRender }, "provider", complete, name, undefined, standard);
  dialog.setFocused?.(true);
  await dialog.ready;
  return { dialog, complete, requestRender, rows: (width = 80) => dialog.render(width), text: () => plain(dialog.render(100)).join("\n") };
}
function assertTemplate(rows: readonly string[], heading: string, description: string) {
  const text = plain(rows);
  expect(text[0]).toMatch(/^─+$/u);
  expect(text[1]).toBe(` ${heading}`);
  expect(text[2]).toBe(` ${description}`);
  expect(text[3]).toBe("");
  expect(text[4]?.startsWith(" >")).toBe(true);
  expect(cellStyle(rows[1]!, heading[0]!)).toEqual(cellStyle(piTheme().fg("accent", heading[0]!), heading[0]!));
  expect(cellStyle(rows[2]!, description[0]!)).toEqual(cellStyle(piTheme().fg("muted", description[0]!), description[0]!));
  expect(cellStyle(rows[4]!, ">")).toEqual(cellStyle(piTheme().fg("accent", ">"), ">"));
  expect(text.at(-2)).toBe(" Esc close");
  expect(text.at(-1)).toMatch(/^─+$/u);
}
beforeEach(() => {
  effects.copy.mockReset().mockResolvedValue(undefined);
  effects.spawn.mockReset().mockImplementation(() => Object.assign(new EventEmitter(), { unref: vi.fn() }));
  setPiAccentColor("blue"); applyPiTheme("dark", false, "truecolor");
});
afterEach(() => { setPiAccentColor("blue"); applyPiTheme("dark", false, "truecolor"); });

describe("one shared live-themed login template", () => {
  it.each(["Xiaomi Token Plan SGP", "Amazon Bedrock", "Synthetic Provider"])("uses the same credential template for %s and submits its exact answer", async name => {
    const { dialog, rows } = await fixture(name);
    const message = `Enter ${name} API key`;
    const answer = dialog.showPrompt(message);
    assertTemplate(rows(100), `Login to ${name}`, message);
    dialog.handleInput?.("a secret answer"); dialog.handleInput?.("\r");
    await expect(answer).resolves.toBe("a secret answer");
    expect(plain(rows(100))[4]).toBe(" > a secret answer");
    expect(cellStyle(rows(100)[4]!, ">")).toEqual(cellStyle(piTheme().fg("accent", ">"), ">"));
    dialog.dispose?.();
  });

  it.each(["truecolor", "256color"] as const)("repaints all shared roles in the live %s theme without changing the draft", async mode => {
    const { dialog, rows } = await fixture("Synthetic");
    const answer = dialog.showPrompt("Credential");
    dialog.handleInput?.("draft");
    for (const appearance of ["dark", "light"] as const) for (const accent of ["pink", "green", "blue"] as const) {
      applyPiTheme(appearance, false, mode); setPiAccentColor(accent);
      assertTemplate(rows(), "Login to Synthetic", "Credential");
      expect(plain(rows())[4]).toContain("draft");
      expect(rows()[0]).toContain(piTheme().getFgAnsi("border"));
      expect(cellStyle(rows().at(-2)!, "E")).toEqual(cellStyle(piTheme().fg("dim", "E"), "E"));
    }
    dialog.handleInput?.("\r"); await expect(answer).resolves.toBe("draft");
    dialog.dispose?.();
  });

  it("keeps manual codes, placeholders, prior context and repeated optional prompts complete", async () => {
    const { dialog, rows, text } = await fixture("Synthetic");
    dialog.showAuth("https://example.test/authorize?x=1&y=2", "Open the authorization page");
    const manual = dialog.showManualInput("Paste callback code");
    assertTemplate(rows(100), "Login to Synthetic", "Paste callback code");
    expect(text()).toContain("Open the authorization page");
    expect(text()).toContain("https://example.test/authorize?x=1&y=2");
    dialog.handleInput?.("callback"); dialog.handleInput?.("\r"); await expect(manual).resolves.toBe("callback");
    const optional = dialog.showPrompt("Optional hint", "leave empty");
    const lines = plain(rows(100));
    expect(lines[2]).toBe(" Optional hint"); expect(lines[3]).toBe(" e.g., leave empty"); expect(lines[4]).toBe("");
    expect(lines[5]?.startsWith(" >")).toBe(true);
    expect(text()).toContain("> callback");
    dialog.handleInput?.("\r"); await expect(optional).resolves.toBe("");
    dialog.dispose?.();
  });

  it("themes browser instructions, safe links and copy feedback while preserving shell-free browser requests", async () => {
    const { dialog, rows, text } = await fixture("Synthetic");
    const url = "https://example.test/authorize?token=synthetic&scope=a";
    dialog.showAuth(url, "Authorize this provider");
    expect(plain(rows())[2]).toBe(" Authorize this provider"); expect(plain(rows())[3]).toBe("");
    const linkRow = rows().find(row => stripTerminalSequences(row).includes("https://example.test"))!;
    expect(cellStyle(linkRow, "h")).toEqual(cellStyle(piTheme().fg("accent", "h"), "h"));
    expect(getOsc8LinkAtColumn(linkRow, 1)).toBe(url);
    expect(effects.spawn).toHaveBeenCalledOnce();
    const [, args, options] = effects.spawn.mock.calls[0]!;
    expect(args).toContain(url); expect(options).toEqual({ stdio: "ignore", detached: true, cwd: "/" });
    expect(getKeybindings().matches("\u0018", "app.message.copy")).toBe(true);
    dialog.handleInput?.("\u0018");
    await vi.waitFor(() => expect(text()).toContain("Copied URL to clipboard"));
    expect(effects.copy).toHaveBeenCalledWith(url);
    effects.copy.mockRejectedValueOnce(new Error("clipboard unavailable"));
    dialog.handleInput?.("\u0018");
    await vi.waitFor(() => expect(text()).toContain("clipboard unavailable"));
    const failed = rows().find(row => stripTerminalSequences(row).includes("clipboard unavailable"))!;
    expect(cellStyle(failed, "c")).toEqual(cellStyle(piTheme().fg("error", "c"), "c"));
    dialog.dispose?.();
  });

  it("retains device code, waiting and confirm-once actions without stale completion repaint", async () => {
    const { dialog, rows, text, requestRender } = await fixture("Synthetic");
    let copied!: () => void;
    effects.copy.mockImplementationOnce(() => new Promise<void>(resolve => { copied = resolve; }));
    dialog.showDeviceCode({ verificationUri: "https://example.test/device", userCode: "TEST-CODE" });
    dialog.showWaiting("Waiting for authentication...");
    expect(plain(rows())[2]).toBe(" Continue in your browser");
    expect(text()).toContain("Enter code: TEST-CODE"); expect(text()).toContain("Waiting for authentication...");
    dialog.handleInput?.("\r"); dialog.handleInput?.("\r");
    expect(effects.copy).toHaveBeenCalledExactlyOnceWith("TEST-CODE");
    expect(effects.spawn).toHaveBeenCalledOnce();
    const prompt = dialog.showPrompt("Next credential");
    const before = requestRender.mock.calls.length;
    copied(); await Promise.resolve();
    expect(requestRender).toHaveBeenCalledTimes(before);
    dialog.handleInput?.("\r"); await prompt;
    dialog.dispose?.();
  });

  it("uses the template for details, informational links and progress; keeps narrow frames bounded", async () => {
    const { dialog, rows, text } = await fixture("Synthetic");
    dialog.showDetails(["First line\nSecond line", "More details"]);
    expect(plain(rows())[2]).toBe(" First line"); expect(text()).toContain("Second line");
    dialog.showInfo("Configure outside the app", [{ label: "Documentation", url: "https://example.test/docs" }], true);
    dialog.showProgress("Waiting for external setup");
    expect(text()).toContain("Configure outside the app"); expect(text()).toContain("Documentation: https://example.test/docs");
    expect(text()).toContain("Waiting for external setup");
    for (const width of [12, 24, 50, 100]) expect(rows(width).every(row => visibleWidth(row) <= width)).toBe(true);
    setPiAccentColor("pink");
    for (const row of rows(100).filter(row => stripTerminalSequences(row).includes("https:"))) expect(row).toContain(piTheme().getFgAnsi("accent"));
    dialog.dispose?.();
  });

  it("does not launch non-web/control-injected targets or replay controls in descriptions", async () => {
    const { dialog, rows, text } = await fixture("Synthetic");
    dialog.showAuth("javascript:alert(1)\u001b]52;bad\u0007", "Unsafe\u001b[31m description");
    expect(effects.spawn).not.toHaveBeenCalled();
    expect(rows().join("\n")).not.toContain("\u001b]52;");
    expect(rows().join("\n")).not.toContain("\u001b[31m");
    expect(text()).toContain("javascript:alert(1)");
    dialog.dispose?.();
  });

  it.each(["\u001b", "\u0003"])("rejects a pending answer and completes cancellation once on %j", async key => {
    const { dialog, complete } = await fixture("Synthetic");
    const result = dialog.showPrompt("Credential").catch(error => error.message);
    dialog.handleInput?.(key); dialog.handleInput?.(key);
    await expect(result).resolves.toBe("Login cancelled");
    expect(complete).toHaveBeenCalledExactlyOnceWith(false, "Login cancelled");
    dialog.dispose?.();
  });

  it("queues early prompts and input in order and never resurrects an early-cancelled login", async () => {
    const runtime = { getColumns: () => 80, getRows: () => 24, requestRender: vi.fn() };
    const complete = vi.fn();
    const dialog = createPiShellLoginDialog(runtime, "p", complete, "Synthetic", undefined, true);
    const answer = dialog.showPrompt("Credential");
    dialog.handleInput?.("early"); dialog.handleInput?.("\r");
    await expect(answer).resolves.toBe("early"); dialog.dispose?.();
    const closed = createPiShellLoginDialog(runtime, "p", complete, "Synthetic", undefined, true);
    const rejected = closed.showPrompt("Credential").catch(error => error.message);
    closed.handleInput?.("\u001b");
    await closed.ready;
    await expect(rejected).resolves.toBe("Login cancelled");
    expect(closed.render(80)).toEqual([]);
    expect(complete).toHaveBeenCalledOnce();
  });

  it("retains the comparison profile's pinned spacing and input presentation", async () => {
    const { dialog, rows } = await fixture("Synthetic", false);
    const answer = dialog.showPrompt("Credential");
    const text = plain(rows());
    expect(text[1]).toBe(" Login to Synthetic"); expect(text[2]).toBe(""); expect(text[3]).toBe("  Credential");
    dialog.handleInput?.("comparison"); dialog.handleInput?.("\r");
    await expect(answer).resolves.toBe("comparison");
  });
});
