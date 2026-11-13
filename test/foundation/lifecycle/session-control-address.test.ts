import { EventEmitter } from "node:events";
import { chmod, lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serveSessionControl } from "../../../src/foundation/lifecycle/session-control.js";

vi.mock("node:fs/promises", () => ({
  chmod: vi.fn(async () => {}), lstat: vi.fn(), mkdir: vi.fn(async () => {}), realpath: vi.fn(), writeFile: vi.fn(async () => {}),
  open: vi.fn(), readdir: vi.fn(), rename: vi.fn(async () => {}), unlink: vi.fn(async () => {}),
}));
vi.mock("node:net", () => ({ createServer: vi.fn(), createConnection: vi.fn() }));
const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
const getuid = Object.getOwnPropertyDescriptor(process, "getuid");
const transport = join("/private/tmp", "session-control-501");
let listen: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(process, "platform", { ...platform, value: "darwin" });
  Object.defineProperty(process, "getuid", { configurable: true, value: () => 501 });
  vi.mocked(realpath).mockImplementation(async path => path === "/tmp" ? "/private/tmp" : String(path));
  vi.mocked(lstat).mockResolvedValue({ isDirectory: () => true, isSymbolicLink: () => false, mode: 0o700, uid: 501 } as never);
  listen = vi.fn((_path, done) => { done(); });
  vi.mocked(createServer).mockImplementation(() => Object.assign(new EventEmitter(), { listen, close: (done: () => void) => done() }) as never);
});
afterEach(() => {
  Object.defineProperty(process, "platform", platform);
  if (getuid) Object.defineProperty(process, "getuid", getuid); else Reflect.deleteProperty(process, "getuid");
});
const options = (runtimeDir: string) => ({
  runtimeDir, runtimeId: "runtime", identity: () => ({ sessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", binding: 1 }),
  handle: async (value: unknown) => value, inspectProcess: async () => ({ pid: process.pid, startIdentity: "owner" }),
});
const longRuntime = resolve("runtime-" + "色".repeat(50));

describe("Unix session transport boundary", () => {
  it("uses a bounded private socket for long UTF-8 paths on Darwin", async () => {
    const host = await serveSessionControl(options(longRuntime));
    const endpoint = listen.mock.calls[0]![0] as string;
    expect(endpoint).toMatch(/[a-f0-9]{32}\.sock$/u);
    expect(endpoint.startsWith(transport)).toBe(true);
    expect(Buffer.byteLength(endpoint)).toBeLessThan(104);
    expect(mkdir).toHaveBeenCalledWith(transport, { mode: 0o700 });
    expect(chmod).toHaveBeenCalledWith(endpoint, 0o600);
    await host.dispose();
  });

  it("preserves existing short Unix endpoints", async () => {
    const runtime = resolve("/");
    const host = await serveSessionControl(options(runtime));
    expect(String(listen.mock.calls[0]![0]).startsWith(join(runtime, "session-controls"))).toBe(true);
    expect(mkdir).not.toHaveBeenCalledWith(transport, expect.anything());
    await host.dispose();
  });

  it.each(["foreign", "linked", "permissive", "not-directory", "redirected"])("rejects %s transport roots before listening or publishing", async boundary => {
    vi.mocked(lstat).mockImplementation(async path => ({
      isDirectory: () => boundary !== "not-directory" || path !== transport,
      isSymbolicLink: () => boundary === "linked" && path === transport,
      mode: boundary === "permissive" && path === transport ? 0o755 : 0o700,
      uid: boundary === "foreign" && path === transport ? 502 : 501,
    }) as never);
    if (boundary === "redirected") vi.mocked(realpath).mockImplementation(async path => path === "/tmp" ? "/private/tmp" : path === transport ? "/foreign" : String(path));
    await expect(serveSessionControl(options(longRuntime))).rejects.toMatchObject({ code: "control-boundary" });
    expect(listen).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
