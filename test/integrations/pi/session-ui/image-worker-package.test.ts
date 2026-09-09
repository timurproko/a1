import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { screenshotPng } from "../../../fixtures/image-sources.js";

const execute = promisify(execFile);
let root: string;

describe("packaged image worker", () => {
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "image-worker-package-"));
    await writeFile(join(root, "package.json"), JSON.stringify({ type: "module" }));
    await cp(resolve("dist/contracts"), join(root, "dist/contracts"), { recursive: true });
    const relative = "dist/integrations/pi/session-ui";
    await mkdir(join(root, relative), { recursive: true });
    for (const name of ["image-worker", "image-preparation-client", "image-preparation", "image-source", "clipboard-image", "system-clipboard"]) {
      await cp(resolve(relative, `${name}.js`), join(root, relative, `${name}.js`));
    }
    const inventory = JSON.parse(await readFile("dist/runtime-payload-inventory.json", "utf8")) as { paths: string[]; declaredAssets: string[] };
    const wasm = "node_modules/@silvia-odwyer/photon-node/photon_rs_bg.wasm";
    expect(inventory.declaredAssets).toContain(wasm);
    for (const file of inventory.paths.filter(file => file.startsWith("node_modules/@silvia-odwyer/photon-node/"))) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await cp(resolve(file), join(root, file));
    }
    await writeFile(join(root, "source.png"), screenshotPng());
    await writeFile(join(root, "probe.mjs"), `
      import { readFile } from 'node:fs/promises';
      import { ImagePreparationClient } from './dist/integrations/pi/session-ui/image-preparation-client.js';
      const client = new ImagePreparationClient();
      try {
        const data = (await readFile(new URL('./source.png', import.meta.url))).toString('base64');
        const result = await client.start(async () => ({kind:'image',data,mimeType:'image/png'})).result;
        console.log(JSON.stringify({kind:result.kind,length:result.data.length,width:result.width,transformed:result.transformed}));
      } catch (error) { console.log(JSON.stringify({code:error.code})); }
      finally { client.dispose(); }
    `);
  }, 20_000);
  afterAll(async () => { if (root !== undefined) await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });

  it("runs the emitted worker using only inventoried runtime codec files, without tsx or Pi", async () => {
    const { stdout, stderr } = await execute(process.execPath, [join(root, "probe.mjs")], { cwd: root, timeout: 20_000, env: { ...process.env, NODE_PATH: "" } });
    expect(stderr).toBe("");
    const result = JSON.parse(stdout);
    expect(result).toMatchObject({ kind: "image", transformed: true });
    expect(result.width).toBeLessThanOrEqual(2000);
    expect(result.length).toBeLessThan(4.5 * 1024 * 1024);
  }, 25_000);

  it("reports a missing WASM asset recoverably instead of passing oversized bytes through", async () => {
    await rm(join(root, "node_modules/@silvia-odwyer/photon-node/photon_rs_bg.wasm"));
    const { stdout } = await execute(process.execPath, [join(root, "probe.mjs")], { cwd: root, timeout: 20_000, env: { ...process.env, NODE_PATH: "" } });
    expect(JSON.parse(stdout)).toEqual({ code: "image-codec" });
  }, 25_000);
});
