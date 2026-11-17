export interface ClaimGateInspection { readonly path: string; readonly state: string; readonly nonce?: string | null; readonly physical?: string; readonly detail?: string }
export function readClaimGate(path: string): { nonce: string; binding?: string } | null;
export function inspectClaimGate(path: string): ClaimGateInspection;
export function recoverClaimGate(approval: ClaimGateInspection): { state: string; nonce?: string | null } | null;
export interface ClaimGateHandle { readonly path: string; readonly nonce: string; bind(binding: string): void; release(): void }
export function tryAcquireClaimGate(path: string): ClaimGateHandle | null;
export function trackClaimGateChild(reservation: { authority: string; nonce: string }): () => void;
