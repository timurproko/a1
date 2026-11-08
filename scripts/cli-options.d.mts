export function optionValue(name: string, options: { required: true; argv?: readonly string[] }): string;
export function optionValue(name: string, options?: { required?: boolean; argv?: readonly string[] }): string | undefined;
