import crossSpawn from "cross-spawn";

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
