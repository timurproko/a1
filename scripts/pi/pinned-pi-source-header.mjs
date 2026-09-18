/**
 * The provenance header every owned copy of a pinned Pi source unit carries. The ledger updater
 * writes it from the ledger record; the ledger check requires it verbatim, so a reviewer merging an
 * upstream change reads the upstream path, commit, and each intentional deviation at the top of
 * the file instead of in the ledger.
 */

const HEADER_WIDTH = 100;

/** Render the canonical header block for one owned-presentation ledger record. */
export function renderProvenanceHeader(record, upstream) {
  const pkg = upstream.packages.find(value => value.name === record.package);
  if (!pkg) throw new Error(`header has no package identity: ${record.id}`);
  const lines = [
    `Provenance: ${record.package} ${pkg.version} (${upstream.license}), commit ${upstream.commit},`,
    `${record.upstreamPath}.`,
    ...wrap(`Modifications: ${record.modifications}`),
    ...wrap(`Deviations: ${record.approvedDeviations.length === 0 ? "none" : record.approvedDeviations.map(deviation => deviation.id).join(", ")}.`),
  ];
  return `/**\n${lines.map(line => ` * ${line}`).join("\n")}\n */\n`;
}

/** Split the file into its leading provenance comment (possibly absent) and the rest. */
export function splitProvenanceHeader(source) {
  const lines = source.split("\n");
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") index += 1;
  const start = index;
  if (lines[index]?.startsWith("/*")) {
    while (index < lines.length && !lines[index].includes("*/")) index += 1;
    index += 1;
  } else if (lines[index]?.startsWith("//")) {
    while (index < lines.length && lines[index].startsWith("//")) index += 1;
  } else {
    return { header: "", body: source };
  }
  const header = lines.slice(start, index).join("\n");
  if (!/\b(?:Pi\b|pi-coding-agent|pi-tui|Provenance:|Adapted from|Source-synchronized|Source-derived|Mechanically adapted)/.test(header)) {
    return { header: "", body: source };
  }
  while (index < lines.length && lines[index].trim() === "") index += 1;
  return { header: `${header}\n`, body: lines.slice(index).join("\n") };
}

/** Whether a destination is a source file that carries a header (JSON resources cannot). */
export function carriesProvenanceHeader(path) {
  return /\.[cm]?[jt]sx?$/.test(path);
}

function wrap(text) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length > 0 && current.length + 1 + word.length > HEADER_WIDTH) {
      lines.push(current);
      current = word;
    } else {
      current = current.length === 0 ? word : `${current} ${word}`;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}
