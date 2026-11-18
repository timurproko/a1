/**
 * The delivery record a pull-request body carries for the shared delivery workflow. This repository only reads it,
 * to route validation; the shared workflow writes and validates it.
 */
export const SHA = /^[a-f0-9]{40}$/u;
const CHANGE = /^(?=.{1,100}$)[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const LABEL = "openspec-implementation";
const FIELDS = ["version", "change", "archive", "acceptanceManifest", "finalizedHead"];
const MAX_BODY_BYTES = 256 * 1024;

/** An error whose `recordCode` is safe to print: it never carries API or body content. */
export function recordFailure(code) {
  return Object.assign(new Error(code), { recordCode: code });
}

/** True when the body holds any fenced block the delivery automation owns. */
export function carriesDeliveryMetadata(body) {
  return fencedBlocks(body, label => label.startsWith("openspec-")).length > 0;
}

/**
 * Read the linked change from a pull-request body. Returns `null` when the body links none, and
 * `{ change, archive?, finalizedHead? }` otherwise. A malformed or repeated block throws.
 */
export function readDeliveryRecord(body) {
  const blocks = fencedBlocks(body, label => label === LABEL);
  if (blocks.length === 0) return null;
  if (blocks.length !== 1) throw recordFailure("delivery-record-duplicate");
  let value;
  try { value = JSON.parse(blocks[0]); } catch { throw recordFailure("delivery-record-json"); }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw recordFailure("delivery-record-shape");
  if (Object.keys(value).some(key => !FIELDS.includes(key))) throw recordFailure("delivery-record-fields");
  if (value.version !== 3 || typeof value.change !== "string" || !CHANGE.test(value.change)) throw recordFailure("delivery-record-identity");
  const finalized = value.archive !== undefined || value.finalizedHead !== undefined;
  if (finalized && (typeof value.archive !== "string" || !value.archive.startsWith("openspec/changes/archive/")
    || (value.finalizedHead !== undefined && (typeof value.finalizedHead !== "string" || !SHA.test(value.finalizedHead))))) {
    throw recordFailure("delivery-record-finalization");
  }
  return { change: value.change, ...(finalized ? { archive: value.archive, finalizedHead: value.finalizedHead } : {}) };
}

function fencedBlocks(body, wanted) {
  if (typeof body !== "string" || Buffer.byteLength(body) > MAX_BODY_BYTES) throw recordFailure("delivery-record-body");
  const blocks = [];
  let fence = null;
  let lines = [];
  for (const line of body.replaceAll("\r\n", "\n").split("\n")) {
    if (fence) {
      if (line.trim().startsWith(fence.marker) && line.trim().replaceAll(fence.marker[0], "") === "") {
        if (fence.wanted) blocks.push(lines.join("\n"));
        fence = null;
        lines = [];
      } else if (fence.wanted) lines.push(line);
      continue;
    }
    const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
    if (opening) fence = { marker: opening[1], wanted: wanted(opening[2].trim()) };
  }
  if (fence?.wanted) throw recordFailure("delivery-record-unclosed");
  return blocks;
}

/** A read-only GitHub reader confined to one repository. */
export function createRepositoryReader({ repository, token, fetchImpl = fetch, apiUrl = "https://api.github.com" }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository ?? "")) throw recordFailure("repository-identity");
  const prefix = `/repos/${repository}`;
  async function get(path) {
    // Security: the reader cannot be pointed outside its repository.
    if (!path.startsWith(`${prefix}/`) || /[\r\n]/u.test(path)) throw recordFailure("api-scope");
    let response;
    try {
      response = await fetchImpl(`${apiUrl}${path}`, {
        headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}), "x-github-api-version": "2022-11-28" },
        signal: AbortSignal.timeout(20_000), redirect: "error",
      });
    } catch { throw recordFailure("github-unavailable"); }
    if (!response.ok) throw recordFailure(response.status === 404 ? "github-not-found" : "github-request");
    try { return JSON.parse(await response.text()); } catch { throw recordFailure("github-response-json"); }
  }
  async function pages(path, limit = 1000) {
    const items = [];
    for (let page = 1; page <= Math.ceil(limit / 100); page += 1) {
      const batch = await get(`${prefix}${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw recordFailure("github-pagination");
      items.push(...batch);
      if (batch.length < 100) return items;
    }
    throw recordFailure("github-pagination-limit");
  }
  return { repository, prefix, get, pages };
}
