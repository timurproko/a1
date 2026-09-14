import { archiveFailure } from "./openspec-archive-policy.mjs";

const DAY = 24 * 60 * 60 * 1000;
export function newArchiveCheckpoint(now = Date.now()) {
  now = Math.floor(now / 1000) * 1000;
  return { version: 1, start: new Date(now - 90 * DAY).toISOString(), end: new Date(now).toISOString(), last: null };
}

export function validateArchiveCheckpoint(value, now = Date.now()) {
  const timestamp = text => typeof text === "string" && Number.isFinite(Date.parse(text)) && new Date(text).toISOString() === text;
  if (value?.version !== 1 || Object.keys(value).some(key => !["version", "start", "end", "last"].includes(key))
    || !timestamp(value.start) || !timestamp(value.end)
    || Date.parse(value.end) > now || Date.parse(value.end) - Date.parse(value.start) > 90 * DAY
    || Date.parse(value.start) > Date.parse(value.end)
    || value.last !== null && (!Array.isArray(value.last) || value.last.length !== 2
      || !timestamp(value.last[0]) || !Number.isSafeInteger(value.last[1]) || value.last[1] < 1
      || value.last[0] < value.start || value.last[0] > value.end)) throw archiveFailure("scan-checkpoint");
  return value;
}

export async function scanArchiveCandidates(reader, checkpoint, limit = 500) {
  validateArchiveCheckpoint(checkpoint);
  const start = checkpoint.last?.[0] ?? checkpoint.start;
  let end = checkpoint.end;
  let first;
  let query;
  // Performance: split dense time windows before GitHub's 1,000-result search ceiling.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    query = `repo:${reader.repository} is:pr is:merged base:develop merged:${start}..${end}`;
    first = await reader.get(`/search/issues?q=${encodeURIComponent(query)}&sort=created&order=asc&per_page=100&page=1`);
    if (first.incomplete_results || !Number.isSafeInteger(first.total_count) || !Array.isArray(first.items)) throw archiveFailure("scan-search-incomplete");
    if (first.total_count <= limit || Date.parse(end) - Date.parse(start) < 1000) break;
    end = new Date(Math.floor((Date.parse(start) + Date.parse(end)) / 2000) * 1000).toISOString();
  }
  if (first.total_count > limit) throw archiveFailure("scan-time-bucket-capacity");
  const items = [...first.items];
  for (let page = 2; items.length < first.total_count; page += 1) {
    const result = await reader.get(`/search/issues?q=${encodeURIComponent(query)}&sort=created&order=asc&per_page=100&page=${page}`);
    if (result.incomplete_results || result.total_count !== first.total_count || !Array.isArray(result.items) || !result.items.length) {
      throw archiveFailure("scan-search-changed");
    }
    items.push(...result.items);
  }
  if (items.length !== first.total_count || new Set(items.map(item => item.number)).size !== items.length) throw archiveFailure("scan-search-changed");
  const candidates = items.map(item => ({ number: item.number, mergedAt: item.pull_request?.merged_at }));
  if (candidates.some(item => !Number.isSafeInteger(item.number) || item.number < 1 || !Number.isFinite(Date.parse(item.mergedAt))
    || Date.parse(item.mergedAt) < Date.parse(start) || Date.parse(item.mergedAt) > Date.parse(end))) {
    throw archiveFailure("scan-merge-identity");
  }
  candidates.sort((a, b) => Date.parse(a.mergedAt) - Date.parse(b.mergedAt) || a.number - b.number);
  const pending = candidates.filter(item => !checkpoint.last || Date.parse(item.mergedAt) > Date.parse(checkpoint.last[0])
    || Date.parse(item.mergedAt) === Date.parse(checkpoint.last[0]) && item.number > checkpoint.last[1]);
  return { candidates: pending.slice(0, limit), scanned: items.length, windowEnd: end,
    complete: pending.length <= limit && end === checkpoint.end, moreInWindow: pending.length > limit };
}

export function advanceArchiveCheckpoint(checkpoint, scan, processed) {
  const last = processed.at(-1);
  if (processed.length !== scan.candidates.length || scan.moreInWindow) {
    return { ...checkpoint, last: last ? [new Date(last.mergedAt).toISOString(), last.number] : checkpoint.last };
  }
  if (scan.complete) return null;
  return { ...checkpoint, start: new Date(Date.parse(scan.windowEnd) + 1000).toISOString(), last: null };
}
