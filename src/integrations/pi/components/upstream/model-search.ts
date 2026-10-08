/**
 * Provenance: @earendil-works/pi-coding-agent 1.1.0 (MIT), commit abe508e1b89912adde45528136c3221eb69acdd7,
 * packages/coding-agent/src/modes/interactive/model-search.ts.
 * Modifications: Mechanical source-synchronized port preserving pinned model search terms for stateful
 * scoped-model filtering.
 * Deviations: none.
 */
export interface ModelSearchItem {
	id: string;
	provider: string;
	name?: string;
}

export function getModelSearchText(item: ModelSearchItem): string {
	const { id, provider } = item;
	const name = item.name ? ` ${item.name}` : "";
	return `${id} ${provider} ${provider}/${id} ${provider} ${id}${name}`;
}

/**
 * The /model selector search should rank exact provider-prefixed queries before proxy-provider IDs
 * like openrouter/openai/gpt-5, so keep the bare model ID out of the leading position.
 */
export function getModelSelectorSearchText(item: ModelSearchItem): string {
	const { id, provider } = item;
	const name = item.name ? ` ${item.name}` : "";
	return `${provider} ${provider}/${id} ${provider} ${id}${name}`;
}
