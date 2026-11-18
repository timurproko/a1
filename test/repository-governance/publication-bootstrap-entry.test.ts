import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, cp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function fixture(linked = false) {
  const root = await mkdtemp(join(tmpdir(), "publication-bootstrap-entry-")); roots.push(root);
  for (const directory of ["scripts/development", "scripts/release", "packages/a1-install"]) await mkdir(join(root, directory), { recursive: true });
  const files = ["development/develop.mjs", "development/dependency-bootstrap.mjs", "development/dependency-inspection.mjs", "development/dependency-process.mjs", "development/environment-probe.mjs", "release/release.mjs", "release/release-arguments.mjs"];
  for (const file of files) await cp(resolve("scripts", file), join(root, "scripts", file));
  const manifest = { name: "fixture", version: "1.0.0", packageManager: "npm@11.13.0", dependencies: { semver: "7.8.5" } };
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  await writeFile(join(root, "package-lock.json"), JSON.stringify({ ...manifest, lockfileVersion: 3, packages: { "": manifest, "node_modules/semver": { version: "7.8.5" } } }));
  await writeFile(join(root, "packages/a1-install/package.json"), JSON.stringify({ name: "@fixture/installer" }));
  const npmCli = join(root, "npm-cli.js");
  await writeFile(npmCli, `const fs=require('node:fs'),path=require('node:path');
const record=value=>fs.appendFileSync('events.jsonl',JSON.stringify(value)+'\\n');const args=process.argv.slice(2);record({event:'npm:'+args[0],args});
if(args[0]==='ci'){
 if(process.env.FIXTURE_SETUP==='fail')process.exit(17);
 if(process.env.FIXTURE_SETUP==='incomplete')process.exit(0);
 fs.mkdirSync('node_modules/semver',{recursive:true});fs.writeFileSync('node_modules/semver/package.json',JSON.stringify({name:'semver',version:'7.8.5',type:'module',main:'index.js'}));
 fs.writeFileSync('node_modules/semver/index.js','export default {};');record({event:'installed'});
}else if(args[0]==='ls'){
 if(process.env.FIXTURE_SETUP==='invalid-tree'){console.log(JSON.stringify({error:{code:'ELSPROBLEMS'},problems:['missing transitive']}));process.exit(1);}
 console.log(JSON.stringify({name:'fixture',dependencies:{semver:{version:'7.8.5'}}}));
}else throw Error('Unexpected fake npm operation');`);
  const shared = `import fs from 'node:fs';import semver from 'semver';const record=value=>fs.appendFileSync('events.jsonl',JSON.stringify(value)+'\\n');`;
  await writeFile(join(root, "scripts/release/publication-client.mjs"), `${shared}
record({event:'import:develop',ready:Boolean(semver)});
export const authoritativeDevelopHead=async()=>{record({event:'source'});return '${'a'.repeat(40)}';};
export const resolveDevelopPreview=async source=>({source,version:'1.0.0-dev.1'});
export const publishDevelopmentPreview=async(preview,installer,options)=>{record({event:'command:develop',preview,installer,args:process.argv.slice(2),signal:Boolean(options.signal)});if(process.env.FIXTURE_COMMAND==='fail')throw Error('fake publication refused');};`);
  await writeFile(join(root, "scripts/release/release-workflow.mjs"), `${shared}
record({event:'import:release',ready:Boolean(semver)});
export const createReleaseRuntime=({signal}={})=>({signal,error:message=>console.error('[release] '+message)});
export const runRelease=async(args,runtime)=>{record({event:'command:release',args,signal:Boolean(runtime.signal)});if(process.env.FIXTURE_COMMAND==='fail')throw Error('fake release refused');};`);
  if (linked) await symlink(join(root, "scripts"), join(root, "linked-scripts"), process.platform === "win32" ? "junction" : "dir");
  const entry = (mode: string) => join(root, linked ? "linked-scripts" : "scripts", mode === "develop" ? "development/develop.mjs" : "release/release.mjs");
  const events = async () => {
    const text = await readFile(join(root, "events.jsonl"), "utf8").catch(() => "");
    return text.trim() ? text.trim().split("\n").map(line => JSON.parse(line)) : [];
  };
  const run = (mode: string, args: string[], env: Record<string, string> = {}, imported = false) => new Promise<{ code: number; stdout: string; stderr: string }>(done => {
    const argv = imported ? ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(entry(mode)).href)});`] : [entry(mode), ...args];
    const environment = { ...process.env };
    for (const key of Object.keys(environment)) if (["npm_execpath", "node_env", "fixture_setup", "fixture_command"].includes(key.toLowerCase())) delete environment[key];
    execFile(process.execPath, argv, { cwd: root, env: { ...environment, npm_execpath: npmCli, NODE_ENV: "production", ...env }, timeout: 15000 }, (error, stdout, stderr) => {
      done({ code: error ? typeof error.code === "number" ? error.code : 99 : 0, stdout, stderr });
    });
  });
  return { root, events, run };
}

describe("actual publication entries in dependency-empty disposable checkouts", () => {
  it.each(["develop", "release"])("repairs before %s imports, then invokes its original command once", async mode => {
    const f = await fixture(), args = mode === "release" ? ["minor"] : ["--fixture", "literal value"];
    const result = await f.run(mode, args); expect(result.code, result.stderr).toBe(0);
    const events = await f.events(), names = events.map(event => event.event);
    expect(names, result.stderr).toEqual(["npm:ci", "installed", "npm:ls", `import:${mode}`, ...(mode === "develop" ? ["source"] : []), `command:${mode}`]);
    expect(events[0].args).toContain("--include=dev"); expect(events.at(-1)).toMatchObject({ args, signal: true });
    expect(result.stderr).toContain("continuing the original command"); expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
  });
  it.each(["develop", "release"])("executes %s through a linked directory without skipping bootstrap", async mode => {
    const f = await fixture(true), args = mode === "release" ? ["patch"] : [];
    const result = await f.run(mode, args);
    expect(result.code, result.stderr).toBe(0);
    expect((await f.events()).map(event => event.event)).toEqual(["npm:ci", "installed", "npm:ls", `import:${mode}`, ...(mode === "develop" ? ["source"] : []), `command:${mode}`]);
    expect(result.stderr).toContain("continuing the original command");
  });
  it.each(["develop", "release"])("imports %s without installing or contacting publication services", async mode => {
    const f = await fixture(); expect((await f.run(mode, [], {}, true)).code).toBe(0); expect(await f.events()).toEqual([]);
  });
  it.each(["fail", "incomplete", "invalid-tree"])("never reaches either command when setup is %s", async setup => {
    for (const mode of ["develop", "release"]) {
      const f = await fixture(), result = await f.run(mode, mode === "release" ? ["patch"] : [], { FIXTURE_SETUP: setup });
      expect(result.code).toBe(1); const names = (await f.events()).map(event => event.event);
      expect(names.filter(name => name === "npm:ci")).toHaveLength(1);
      expect(names.some(name => name.startsWith("import:") || name.startsWith("command:") || name === "source")).toBe(false);
      expect(result.stderr).toMatch(/[Pp]ublication was not started/u);
      expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
    }
  });
  it.each([[], ["patch", "--approve"], ["unknown"], ["9007199254740992.0.0"], ["1.0.0\n"]])("keeps release usage errors mutation-free for %j", async (...args) => {
    const f = await fixture(), result = await f.run("release", args);
    expect(result.code).toBe(2); expect(result.stderr).toContain("Usage: npm run release"); expect(await f.events()).toEqual([]);
  });
  it.each(["develop", "release"])("skips reinstallation for healthy %s and preserves operational failures", async mode => {
    const f = await fixture(), args = mode === "release" ? ["0.4.0"] : [];
    expect((await f.run(mode, args)).code).toBe(0);
    await writeFile(join(f.root, "events.jsonl"), "");
    const result = await f.run(mode, args, { FIXTURE_COMMAND: "fail" });
    expect(result.code).toBe(1); const names = (await f.events()).map(event => event.event);
    expect(names[0]).toBe("npm:ls"); expect(names).not.toContain("npm:ci"); expect(names.filter(name => name === `command:${mode}`)).toHaveLength(1);
    expect(result.stderr).toContain("refused");
  });
});
