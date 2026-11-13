export const DELIVERY_HOLD_LABEL: string;
export const DOCUMENTATION_OPT_OUT_LABEL: string;
export const DELIVERY_ADAPTER: Readonly<{ repository: string; baseBranch: string; documentationAutoMerge: string; baseCurrency: string; requiredCheck: string; [key: string]: unknown }>;
export function deliveryMutationBlocker(pull: unknown, options?: { documentation?: boolean }): "delivery-labels-unverifiable" | "delivery-hold" | "no-auto-merge" | null;
export function sameDeliverySnapshot(current: unknown, expected: unknown, repository: string, options?: { head?: string; documentation?: boolean }): boolean;
