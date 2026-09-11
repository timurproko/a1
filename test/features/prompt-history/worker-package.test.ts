import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("runs emitted history persistence outside the checkout without Pi, tsx, or any node_modules", async () => {
  const root = await mkdtemp(join(tmpdir(), "history-worker-package-"));
  try {
    await mkdir(join(root, "dist/features"), { recursive: true });
    await writeFile(join(root, "package.json"), '{"type":"module"}');
    await cp(resolve("dist/contracts"), join(root, "dist/contracts"), { recursive: true });
    await cp(resolve("dist/features/prompt-history"), join(root, "dist/features/prompt-history"), { recursive: true });
    for (const file of ["product-identity.js", "product-identity.json"]) await cp(resolve("dist", file), join(root, "dist", file));
    await writeFile(join(root, "probe.mjs"), `
      import { PromptHistoryService } from './dist/features/prompt-history/index.js';
      import { resolve } from 'node:path';
      const service = new PromptHistoryService({dataDir:resolve('data'),profileRoot:resolve('profile'),limit:100});
      const failures=[];service.onFailure(code=>failures.push(code));
      const result=await service.record({id:'packaged',text:'synthetic packaged history',kind:'prompt',timestamp:1});
      await service.close();
      console.log(JSON.stringify({result,failures}));
    `);
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [join(root, "probe.mjs")], {
      cwd: root, timeout: 15000, env: { ...process.env, NODE_PATH: "" },
    });
    expect(stderr).toBe("");
    expect(JSON.parse(stdout)).toEqual({ result: "committed", failures: [] });
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
}, 20000);
