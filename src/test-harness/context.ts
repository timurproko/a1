import { existsSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface ScenarioContext {
  readonly root: string;
  readonly home: string;
  readonly configDir: string;
  readonly dataDir: string;
  readonly runtimeDir: string;
  readonly workspace: string;
  readonly artifacts: string;
  readonly fixtureBin: string;
  readonly childLog: string;
  readonly terminalSizePath: string;
  readonly environment: NodeJS.ProcessEnv;
}

export async function createScenarioContext(name: string): Promise<ScenarioContext> {
  const root = await mkdtemp(join(tmpdir(), `addone-${safe(name)}-`));
  const home = join(root, "home");
  const configDir = join(root, "config");
  const dataDir = join(root, "data");
  const runtimeDir = join(root, "runtime");
  const workspace = join(root, "workspace");
  const artifacts = join(root, "artifacts");
  const fixtureBin = join(root, "fixture-bin");
  await Promise.all([home, configDir, dataDir, runtimeDir, workspace, artifacts, fixtureBin].map(path => mkdir(path, { recursive: true, mode: 0o700 })));
  const source = resolve(fileURLToPath(new URL("./fixtures/pi", import.meta.url)));
  await cp(join(source, "pi"), join(fixtureBin, "pi"));
  await cp(join(source, "pi.cmd"), join(fixtureBin, "pi.cmd"));
  await chmod(join(fixtureBin, "pi"), 0o755);
  const childLog = join(artifacts, "child.log");
  const terminalSizePath = join(root, "terminal-size.json");
  const adjacentFixtureEntry = resolve(fileURLToPath(new URL("./fixtures/pi/fixture.js", import.meta.url)));
  const fixtureEntry = existsSync(adjacentFixtureEntry)
    ? adjacentFixtureEntry
    : resolve(process.cwd(), "dist", "src", "test-harness", "fixtures", "pi", "fixture.js");
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    APPDATA: join(home, "AppData", "Roaming"),
    LOCALAPPDATA: join(home, "AppData", "Local"),
    XDG_CONFIG_HOME: configDir,
    XDG_DATA_HOME: dataDir,
    XDG_RUNTIME_DIR: runtimeDir,
    ADDONE_CONFIG_DIR: configDir,
    ADDONE_DATA_DIR: dataDir,
    ADDONE_RUNTIME_DIR: runtimeDir,
    ADDONE_DATABASE_PATH: join(dataDir, "control.sqlite3"),
    ADDONE_FIXTURE_ENTRY: fixtureEntry,
    ADDONE_FIXTURE_LOG: childLog,
    ADDONE_INTRO_DURATION_MS: "0",
    ADDONE_TEST_TERMINAL_SIZE_PATH: terminalSizePath,
    PI_CONFIG_DIR: join(root, "pi-config"),
    PATH: `${fixtureBin}${delimiter}${process.env.PATH ?? ""}`,
    NO_COLOR: "1",
  };
  await writeFile(join(artifacts, "environment.json"), JSON.stringify(redactEnvironment(environment), null, 2));
  return { root, home, configDir, dataDir, runtimeDir, workspace, artifacts, fixtureBin, childLog, terminalSizePath, environment };
}

function safe(name: string): string { return name.replace(/[^a-z0-9_-]/gi, "-").toLowerCase(); }
function redactEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  const allowed = ["HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_RUNTIME_DIR", "ADDONE_CONFIG_DIR", "ADDONE_DATA_DIR", "ADDONE_RUNTIME_DIR", "ADDONE_DATABASE_PATH", "ADDONE_FIXTURE_ENTRY", "ADDONE_FIXTURE_LOG", "ADDONE_INTRO_DURATION_MS", "ADDONE_TEST_TERMINAL_SIZE_PATH", "PI_CONFIG_DIR", "PATH", "NO_COLOR"];
  return Object.fromEntries(allowed.flatMap(key => environment[key] === undefined ? [] : [[key, environment[key] as string]]));
}
