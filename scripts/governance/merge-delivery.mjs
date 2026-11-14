#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify, parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { archiveReaderFromGet } from "./openspec-archive-github.mjs";
import { integrationIdentity, oneShotMaintainerMerge } from "./delivery-integration.mjs";
import { DELIVERY_ADAPTER } from "./delivery-control.mjs";

export async function main(args = process.argv.slice(2), environment = process.env) {
  const { values } = parseArgs({ args, options: { repository: { type: "string" }, pr: { type: "string" }, head: { type: "string" }, base: { type: "string" },
    "body-digest": { type: "string" }, "acceptance-digest": { type: "string" }, "maintainer-requested": { type: "boolean" }, inspect: { type: "boolean" } } });
  if (!values.inspect && values["maintainer-requested"] !== true) return { disposition: "blocked", reason: "integration-current-request-required", attempted: false, authorityRetained: false };
  if (values.repository !== DELIVERY_ADAPTER.repository || !/^[1-9]\d*$/.test(values.pr ?? "") || values.inspect && values["maintainer-requested"]) throw new Error("integration-explicit-identity-required");
  if (!values.inspect && environment.GITHUB_ACTIONS === "true") throw new Error("integration-workflow-forbidden");
  let token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
  if (!token) token = (await promisify(execFile)("gh", ["auth", "token", "--hostname", "github.com"], { timeout: 10_000, maxBuffer: 16 * 1024 })).stdout.trim();
  const prefix = `/repos/${values.repository}`, number = Number(values.pr), deadline = Date.now() + 120_000;
  const api = async (path, options = {}) => {
    if (path !== "/user" && !path.startsWith(`${prefix}/`)) throw new Error("integration-api-scope");
    const remaining = deadline - Date.now(); if (remaining <= 0) throw new Error("integration-deadline");
    const response = await fetch(`https://api.github.com${path}`, { method: options.method ?? "GET", redirect: "error", signal: AbortSignal.timeout(Math.min(20_000, remaining)),
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", ...(options.body ? { "content-type": "application/json" } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    if (!response.ok) throw Object.assign(new Error("integration-remote-refused"), { archiveCode: `github-${response.status}` });
    const text = await response.text(); if (Buffer.byteLength(text) > 8 * 1024 * 1024) throw new Error("integration-response-size");
    return JSON.parse(text);
  };
  const reader = archiveReaderFromGet(values.repository, path => api(path));
  if (values.inspect) return { disposition: "inspection", candidate: integrationIdentity(await reader.get(`${prefix}/pulls/${number}`)) };
  return oneShotMaintainerMerge({ requested: true, environment, reader, principal: () => api("/user"),
    candidate: { repository: values.repository, pr: number, head: values.head, base: values.base, bodyDigest: values["body-digest"], acceptanceDigest: values["acceptance-digest"] },
    merge: (pr, body) => api(`${prefix}/pulls/${pr}/merge`, { method: "PUT", body }) });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(result => { console.log(JSON.stringify(result, null, 2)); if (result.disposition === "blocked") process.exitCode = 1; })
    .catch(() => { console.error("Protected integration could not verify the request; no retry or future authority is retained."); process.exitCode = 1; });
}
