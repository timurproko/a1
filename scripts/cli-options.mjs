/**
 * Reads the value after `name` in a `--name value` argument list.
 * Invariant: a flag given without a value is always a usage error, never the next flag read as a value.
 * An absent flag is `undefined` unless `required` is set, when it is an error too.
 */
export function optionValue(name, { required = false, argv = process.argv } = {}) {
  const index = argv.indexOf(name);
  if (index < 0) {
    if (required) throw new Error(`${name} is required`);
    return undefined;
  }
  const value = argv[index + 1];
  if (value === undefined || value.length === 0 || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}
