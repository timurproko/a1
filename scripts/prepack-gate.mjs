import crossSpawn from "cross-spawn";

// The packaged-candidate release scenarios must create an inner tarball. That
// inner pack is already running under the complete outer release gate and must
// not recursively start the same gate again.
if (process.env.ADDONE_INTERNAL_PACKAGING === "1") process.exit(0);

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const child = crossSpawn(npm, ["run", "check"], { stdio: "inherit", env: process.env, windowsHide: true });
child.once("error", error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
