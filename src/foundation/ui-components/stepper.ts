/**
 * A value stepped through a range or through the numbers it is offered. The two
 * are the same control: a list of numbers is a range whose entries are its ends.
 */

export interface NumericRange {
  /** Smallest value accepted, or null when nothing states one. */
  readonly minimum: number | null;
  /** Largest value accepted, or null when nothing states one. */
  readonly maximum: number | null;
  /** The numbers offered, when the offer is the whole domain rather than shortcuts. */
  readonly values: readonly number[] | null;
}

/** The numbers a list of choices offers, or null when it is not all numbers. */
export function numericValues(choices: readonly unknown[] | null): readonly number[] | null {
  if (choices === null || choices.length === 0) return null;
  const numbers = choices.filter((choice): choice is number => typeof choice === "number");
  return numbers.length === choices.length ? [...numbers].sort((left, right) => left - right) : null;
}

/**
 * Where a step lands, or null when there is nowhere further to go. At an end the
 * caller draws the control as unavailable rather than reporting a refusal.
 */
export function steppedValue(range: NumericRange, from: number, delta: -1 | 1): number | null {
  if (range.values !== null) {
    const at = range.values.indexOf(from);
    const next = (at < 0 ? 0 : at) + delta;
    return next >= 0 && next < range.values.length ? range.values[next] ?? null : null;
  }
  const next = from + delta;
  if (range.minimum !== null && next < range.minimum) return null;
  return range.maximum !== null && next > range.maximum ? null : next;
}

/** Which ends of the range a value can still move towards. */
export function stepperEnds(range: NumericRange, from: number): { readonly lower: boolean; readonly raise: boolean } {
  return {
    lower: steppedValue(range, from, -1) !== null,
    raise: steppedValue(range, from, 1) !== null,
  };
}
