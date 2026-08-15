import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FORBIDDEN_NODE_PROTOCOL_PAYLOADS = /ptyBytes|terminalBytes|terminalOutput|inputBytes|renderedCells?|cellGrid|screenBuffer|ansiStream|framebuffer|base64Terminal|rawTerminal|opaqueChild/i;
const FORBIDDEN_EXPLICIT_MODE_COMPOSED = /native-host-protocol|structured-agent-runtime|features\/workspace|features\/owned-ui|NativeHost|composedTerminal|createFixedTwoByTwo/i;

describe("native host and transparent-mode executable boundaries", () => {
  it("keeps hot-path payload fields out of every Node-facing protocol and workspace source", async () => {
    const files = [
      ...await sourceFiles("src/foundation/native-host-protocol"),
      ...await sourceFiles("src/foundation/protocol"),
      ...await sourceFiles("src/features/workspace"),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const [path, source] of files) {
      expect(FORBIDDEN_NODE_PROTOCOL_PAYLOADS.test(source), path).toBe(false);
    }
  });

  it("keeps explicit launch and transparent attachment independent from composed host code", async () => {
    const files = [
      ...await sourceFiles("src/features/launch"),
      ...await sourceFiles("src/foundation/transparent-terminal"),
      ...await sourceFiles("src/cli"),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const [path, source] of files) {
      expect(FORBIDDEN_EXPLICIT_MODE_COMPOSED.test(source), path).toBe(false);
    }
  });

  it("keeps native terminal implementation dependencies out of the JavaScript package authority", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
    expect(dependencies).not.toContain("node-pty");
    expect(dependencies).not.toContain("@xterm/headless");
    expect(dependencies).not.toContain("portable-pty");
    expect(dependencies).not.toContain("homebridge-node-pty-prebuilt-multiarch");
  });

  it("keeps pane hot-path instrumentation native and exports metadata only", async () => {
    const workspace = await readFile("native/terminal-host/src/workspace.rs", "utf8");
    const runner = await readFile("scripts/run-terminal-host-probe.mjs", "utf8");
    expect(workspace).toContain("addone-terminal-host-hot-path-v1");
    expect(workspace).toContain('nodeRelay\\\":false');
    expect(workspace).toContain('rawPayloadExported\\\":false');
    expect(workspace).toContain("stream_identity");
    expect(workspace).toContain("input_identity");
    expect(runner).toContain('stdio: "inherit"');
    expect(runner).not.toContain('stdio: "pipe"');
    expect(runner).not.toContain("encoding:");
  });

  it("bounds the Node-to-native proof frame and preserves exact transparent stdio inheritance", async () => {
    const codec = await readFile("src/foundation/native-host-protocol/codec.ts", "utf8");
    const messages = await readFile("src/foundation/native-host-protocol/messages.ts", "utf8");
    const launcher = await readFile("src/foundation/transparent-terminal/native-launcher.ts", "utf8");
    expect(messages).toContain("MAX_NATIVE_HOST_MESSAGE_BYTES = 1024 * 1024");
    expect(codec).toContain("frame-too-large");
    expect(launcher).toContain('stdio: "inherit"');
    expect(launcher).toContain("shell: false");
  });
});

async function sourceFiles(root: string): Promise<readonly [string, string][]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: [string, string][] = [];
  for (const entry of entries) {
    const path = join(root, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (entry.name.endsWith(".ts")) files.push([path, await readFile(path, "utf8")]);
  }
  return files;
}
