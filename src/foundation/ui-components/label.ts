/**
 * Setting identifiers are written for code; a screen shows them to a person.
 * `httpIdleTimeoutMs` reads as "Http Idle Timeout Ms", not as itself.
 */

const ACRONYMS: Readonly<Record<string, string>> = {
  ui: "UI",
  url: "URL",
  api: "API",
  id: "ID",
  ms: "Ms",
  cli: "CLI",
  tui: "TUI",
  sgr: "SGR",
  ansi: "ANSI",
};

/** Splits camelCase, snake_case, and kebab-case into display words. */
export function humanizeLabel(identifier: string): string {
  const words = identifier
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/\s+/)
    .filter(word => word.length > 0);
  if (words.length === 0) return identifier;
  return words.map(word => {
    const known = ACRONYMS[word.toLowerCase()];
    if (known !== undefined) return known;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}

/** Section titles use the same rules, so `owned-ui` reads as "Owned UI". */
export function humanizeTitle(identifier: string): string {
  return humanizeLabel(identifier);
}
