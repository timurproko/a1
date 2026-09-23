/**
 * Provenance: @earendil-works/pi-tui 0.87.1 (MIT), commit f07218c4d4bbc12bef056a7058c3dd49dfe41abe,
 * packages/tui/src/utils.ts.
 * Modifications: Owned editor core or minimal editor-local helper subset; public imports, strict
 * types, typed persistent-history hooks, and semantic border state. Public terminal runtime/exports
 * remain shared and unchanged. See docs/architecture/history-editor-provenance.md.
 * Deviations: persistent-history-owned-editor-boundary.
 */
// segmenters (shared instance)
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

/**
 * Get the shared grapheme segmenter instance.
 */
export function getGraphemeSegmenter(): Intl.Segmenter {
	return graphemeSegmenter;
}

/**
 * Get the shared word segmenter instance.
 */
export function getWordSegmenter(): Intl.Segmenter {
	return wordSegmenter;
}

export const cjkBreakRegex =
	/[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}\p{Script_Extensions=Bopomofo}]/u;

export const cjkPunctuationRegex = new RegExp(
	`(?:(?=\\p{Punctuation})${cjkBreakRegex.source}|[，．：；！？（）［］｛｝“”‘’…—])`,
	"u",
);

export const autocompleteSeparatorRegex = new RegExp(`(?:\\s|${cjkPunctuationRegex.source})`, "u");

export const autocompleteBoundaryRegex = new RegExp(`(?:^|${autocompleteSeparatorRegex.source})`, "u");

export const PUNCTUATION_REGEX = /[(){}[\]<>.,;:'"!?+\-=*/\\|&%^$#@~`]/;

/**
 * Check if a character is whitespace.
 */
export function isWhitespaceChar(char: string): boolean {
	return /\s/.test(char);
}
