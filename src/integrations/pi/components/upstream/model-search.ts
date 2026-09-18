/**
 * Provenance: @earendil-works/pi-coding-agent 0.84.2 (MIT), commit 914cf1472e715297caa30db4b9535d534a9eb718,
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
