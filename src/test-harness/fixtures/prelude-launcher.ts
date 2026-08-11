import spawn from "cross-spawn";
import { createInterface } from "node:readline";

const [prelude, command, ...arguments_] = process.argv.slice(2);
if (!prelude || !command) {
  process.stderr.write("usage: prelude-launcher <prelude> <command> [args...]\n");
  process.exit(2);
}

process.stdout.write(`${prelude}\r\n`);
const child = spawn(command, arguments_, { stdio: "inherit", env: process.env });
child.on("error", error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  if (process.env.ADDONE_POST_EXIT_SHELL_PROBE === "1") {
    runShellProbe(code ?? 1);
    return;
  }
  process.exit(code ?? 1);
});

function runShellProbe(childExitCode: number): void {
  const shell = createInterface({ input: process.stdin, output: process.stdout, terminal: true, historySize: 0 });
  shell.setPrompt("PARENT-SHELL> ");
  shell.prompt();
  shell.once("line", line => {
    process.stdout.write(`PARENT-SHELL-EXEC:${JSON.stringify(line)}\r\n`);
    shell.close();
    process.exit(childExitCode);
  });
}
