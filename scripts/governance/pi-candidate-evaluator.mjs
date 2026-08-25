import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export async function evaluatePiCandidate(request, options = {}) {
  const repository = resolve(options.repository ?? ".");
  for (const [name, version] of Object.entries(request.packages ?? {})) {
    if (!name.startsWith("@earendil-works/pi-") || !exactVersion.test(version)) throw new TypeError(`candidate package ${name}@${version} is not exact`);
  }
  const timeoutMs = request.timeoutMs ?? 120_000;
  const lockBefore = digest(await readFile(join(repository, "package-lock.json")));
  const root = await (options.createRoot ?? (() => mkdtemp(join(tmpdir(), "pi-candidate-"))))();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`candidate evaluation timed out after ${timeoutMs}ms`)), timeoutMs);
  const stages = [];
  try {
    const operations = options.operations ?? defaultOperations(repository);
    for (const stage of ["install", "compile", "runtime"]) {
      try {
        const detail = await operations[stage](root, request.packages, controller.signal);
        stages.push({ stage, passed: true, detail: bounded(detail ?? "passed") });
      } catch (error) {
        const message = controller.signal.aborted ? `timed out after ${timeoutMs}ms` : bounded(error instanceof Error ? error.message : String(error));
        stages.push({ stage, passed: false, detail: message });
        return report(request.packages, false, stages, [{ stage, message }]);
      }
    }
    return report(request.packages, true, stages, []);
  } finally {
    clearTimeout(timer);
    await (options.cleanup ?? (path => rm(path, { recursive: true, force: true })))(root);
    const lockAfter = digest(await readFile(join(repository, "package-lock.json")));
    if (lockAfter !== lockBefore) throw new Error("candidate evaluator changed the accepted lockfile");
  }
}

function defaultOperations(repository) {
  return {
    async install(root, packages, signal) {
      const manifest = JSON.parse(await readFile(join(repository, "package.json"), "utf8"));
      manifest.dependencies = { ...manifest.dependencies, ...packages };
      await writeFile(join(root, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      await Promise.all(["src", "tsconfig.json", "tsconfig.build.json"].map(path => cp(join(repository, path), join(root, path), { recursive: true })));
      await command(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--ignore-scripts", "--package-lock=false", "--no-audit", "--no-fund"], root, signal);
      return "exact candidate dependency set installed";
    },
    async compile(root, _packages, signal) {
      await command(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.build.json"], root, signal);
      return "TypeScript compatibility passed";
    },
    async runtime(root, _packages, signal) {
      const expression = `import('./dist/integrations/pi/engine/conformance.js').then(async m=>console.log(JSON.stringify(await m.runPiUpgradeConformance())))`;
      const value = await command(process.execPath, ["--input-type=module", "-e", expression], root, signal);
      JSON.parse(value.stdout.trim());
      return "runtime capability conformance passed";
    },
  };
}

async function command(executable, arguments_, cwd, signal) {
  return execute(executable, arguments_, { cwd, signal, timeout: 120_000, maxBuffer: 1024 * 1024 });
}
function report(packages, passed, stages, migrations) { return { schema: "pi-candidate-migration-report-v1", packages, passed, stages, migrations }; }
function bounded(value) { const text = String(value).replace(/[\r\n\t]+/g, " ").trim(); return text.length > 500 ? `${text.slice(0, 497)}...` : text; }
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
