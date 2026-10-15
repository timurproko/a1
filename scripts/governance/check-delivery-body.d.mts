export interface DeliveryBodyInspection { ok: boolean; complete: boolean; reason?: string }
export function inspectDeliveryBody(body: string, options?: { final?: boolean }): DeliveryBodyInspection;
export function main(args?: string[], options?: { readPullBody?: (number: string) => Promise<string> }): Promise<DeliveryBodyInspection>;
