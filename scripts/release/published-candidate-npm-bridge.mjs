// The public tags deliberately still name the predecessor. Pin only A1's version discovery;
// every installation and tarball download is forwarded unchanged to the real registry/npm CLI.
import { spawn } from "node:child_process";

const cli = process.env.A1_SMOKE_NPM_CLI;
const version = process.env.A1_SMOKE_VERSION;
if (!cli || !/^\d+\.\d+\.\d+(?:-dev\.[1-9]\d*)?$/u.test(version ?? "")) throw new Error("invalid exact-candidate npm bridge environment");
const args = process.argv.slice(2);
if (["view", "show"].includes(args[0]) && ["@timurproko/a1@latest", "@timurproko/a1@next"].includes(args[1])) {
  args[1] = `@timurproko/a1@${version}`;
}
const child = spawn(process.execPath, [cli, ...args], { stdio: "inherit", windowsHide: true });
child.once("error", () => { process.exitCode = 1; });
child.once("close", code => { process.exitCode = code ?? 1; });
