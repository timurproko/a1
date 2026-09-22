// Development-only GitHub CLI fixture for visually checking the linked footer badge.
import { execFileSync } from "node:child_process";

const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
process.stdout.write(JSON.stringify({
  number: 540,
  url: "https://github.com/timurproko/a1/pull/540",
  state: "OPEN",
  headRefName: branch,
}));
