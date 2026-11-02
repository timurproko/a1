import { readFile, writeFile, open } from "node:fs/promises";
import { createServer, createConnection } from "node:net";
import spawn from "cross-spawn";

function connects(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(3000, () => finish(false));
  });
}
async function probe(plan) {
  const server = createServer((socket) => socket.end());
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let loopback;
  try {
    loopback = await connects("127.0.0.1", server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  let credentialsHidden = false;
  try {
    await readFile(plan.canary);
  } catch (error) {
    credentialsHidden = ["EACCES", "EPERM", "ENOENT"].includes(error.code);
  }
  let sourceImmutable = false;
  await readFile(plan.orchestrator);
  try {
    const file = await open(plan.orchestrator, "r+");
    await file.close();
  } catch (error) {
    sourceImmutable = ["EACCES", "EPERM", "EROFS"].includes(error.code);
  }
  const unprivileged =
    process.platform === "win32"
      ? process.env.NATIVE_FIXTURE_LOW_PRIVILEGE === "verified"
      : process.getuid() === plan.uid && plan.uid > 0;
  return {
    loopback,
    remoteBlocked: !(await connects(plan.remoteHost, 443)),
    credentialsHidden,
    unprivileged,
    sourceImmutable,
  };
}
async function execute(plan) {
  const result = await new Promise((resolve) => {
    const child = spawn(plan.command[0], plan.command.slice(1), {
      cwd: plan.repo,
      env: plan.environment,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", (error) =>
      resolve({ exitCode: 1, error: error.code ?? "SPAWN" }),
    );
    child.once("exit", (code, signal) =>
      resolve({ exitCode: code ?? 1, signal }),
    );
  });
  await writeFile(plan.result, JSON.stringify(result));
  process.exitCode = result.exitCode;
}
const plan = JSON.parse(await readFile(process.argv[2], "utf8"));
if (plan.kind === "probe")
  await writeFile(plan.result, JSON.stringify(await probe(plan)));
else if (plan.kind === "run") await execute(plan);
else throw new Error("unknown native fixture worker request");
