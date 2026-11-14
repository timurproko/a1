export interface ClaimGateHandle { readonly path: string; readonly nonce: string; bind(binding: string): void; release(): void }
export function tryAcquireClaimGate(path: string): ClaimGateHandle | null;
export function trackClaimGateChild(reservation: { authority: string; nonce: string }): () => void;
