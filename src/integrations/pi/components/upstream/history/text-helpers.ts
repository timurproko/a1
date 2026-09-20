/**
 * Provenance: @earendil-works/pi-tui 0.86.0 (MIT), commit ecac0a9c4edad3dac5d9f8b40e0c7db7a56471fc,
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

export const PUNCTUATION_REGEX = /[(){}[\]<>.,;:'"!?+\-=*/\\|&%^$#@~`]/;

/**
 * Check if a character is whitespace.
 */
export function isWhitespaceChar(char: string): boolean {
	return /\s/.test(char);
}
