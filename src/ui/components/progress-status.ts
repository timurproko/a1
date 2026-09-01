/** Returns spinner-backed status text with A1's canonical three-period marker. */
export function progressStatusText(message: string): string {
  return `${message.replace(/(?:…|\.+)$/u, "")}...`;
}
