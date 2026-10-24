import { mkdir, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

// Security: test-only dependency substitution executes untouched Pi's CLI presenter, but
// never construct a real credential store or request a remote model catalog.
const modelRuntimeSource = `
export class CredentialSynchronizationError extends Error {}
export class ModelRuntime {
  static async create() {
    const scenario = JSON.parse(process.env.PACKAGE_MESSAGE_SCENARIO);
    if (scenario.kind === "creation-error") throw new Error(scenario.detail);
    if (scenario.kind === "non-error") throw "not an Error";
    return { async refresh() {
      if (scenario.kind === "refresh-error") throw new Error(scenario.detail);
      return {
        aborted: scenario.kind === "timeout",
        errors: new Map((scenario.errors ?? []).map(([provider, message]) => [provider, new Error(message)])),
      };
    }};
  }
}
`;
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/core/model-runtime.js") && url.includes("/pi-coding-agent/")) {
      return { format: "module", source: modelRuntimeSource, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const [producer, home, encodedCases] = process.argv.slice(2);
if (!["pinned", "owned"].includes(producer) || !home || (home !== "--server" && !encodedCases)) throw new Error("Invalid producer input");
function selectHome(directory) {
  process.env.HOME = directory;
  process.env.USERPROFILE = directory;
  process.env.PI_CODING_AGENT_DIR = join(directory, ".a1", "agent");
  process.env.A1_PROFILE_HOME = directory;
  process.chdir(directory);
}
if (home !== "--server") selectHome(home);
const repository = resolve(import.meta.dirname, "../..");
const write = process.stdout.write.bind(process.stdout);
let stdout = "";
let stderr = "";
process.stdout.write = chunk => { stdout += String(chunk); return true; };
process.stderr.write = chunk => { stderr += String(chunk); return true; };
let pinned, owned, packages;
async function capture(directory, cases) {
  selectHome(directory);
  pinned ??= producer === "pinned"
    ? await import(pathToFileURL(join(repository, "node_modules/@earendil-works/pi-coding-agent/dist/package-manager-cli.js")).href) : undefined;
  owned ??= producer === "owned" ? await import(pathToFileURL(join(repository, "src/cli/index.ts")).href) : undefined;
  packages ??= producer === "owned" ? await import(pathToFileURL(join(repository, "src/integrations/pi/engine/package-integration.ts")).href) : undefined;
  const results = [];
  for (const entry of cases) {
    stdout = "";
    stderr = "";
    process.exitCode = 0;
    process.env.PACKAGE_MESSAGE_SCENARIO = JSON.stringify(entry.scenario ?? {});
    if (entry.settings) {
      await mkdir(join(directory, ".a1", "agent"), { recursive: true });
      await writeFile(join(directory, ".a1", "agent", "settings.json"), `${JSON.stringify(entry.settings, null, 2)}\n`);
    }
    if (pinned) {
      if (!await pinned.handlePackageCommand(entry.pinnedArgs)) throw new Error("Unrecognized pinned fixture command");
    } else {
      process.exitCode = await owned.dispatchCli(entry.ownedArgs, {
        launch: async () => { throw new Error("Interactive launch forbidden in CLI fixture"); },
        version: async () => { throw new Error("Version dispatch forbidden in CLI fixture"); },
        update: async () => { throw new Error("Self-update forbidden in CLI fixture"); },
        packages: request => owned.runPackageCommand(request, { createPort: packages.createPiPackagesPort }),
      }, { stdout: message => { stdout += message; }, stderr: message => { stderr += message; } }, owned.cliCapabilities("0.1.8-dev"));
    }
    results.push({ id: entry.id, stdout, stderr, code: process.exitCode ?? 0 });
  }
  process.exitCode = 0;
  // Windows must not retain a process cwd inside the scenario's disposable home.
  process.chdir(repository);
  return results;
}
if (home === "--server") {
  const { createInterface } = await import("node:readline");
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    const request = JSON.parse(line);
    write(`${JSON.stringify(await capture(request.home, request.cases))}\n`);
  }
} else write(JSON.stringify(await capture(home, JSON.parse(encodedCases))));
