#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { discoverRepository } from "./local-cleanup-git.mjs";
import { inspectDeliveryHandoff } from "./delivery-publication.mjs";

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { repo: { type: "string" }, repository: { type: "string" }, path: { type: "string" },
    branch: { type: "string" }, change: { type: "string" }, pr: { type: "string" }, unfinished: { type: "string", multiple: true } } });
  if (values.path ? !values.repo || values.repository !== undefined : !values.repository || values.repo !== undefined) throw new Error("choose --repo PRIMARY --path CHECKOUT, or remote-only --repository OWNER/REPO --branch TOPIC");
  const identity = values.path ? await discoverRepository(values.repo) : { repository: values.repository };
  return inspectDeliveryHandoff({ identity, path: values.path, branch: values.branch, change: values.change, pr: Number(values.pr), unfinished: values.unfinished ?? null });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
