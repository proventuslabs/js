import type { BackoffStrategy } from "../backoff/interface.ts";

/**
 * Limits a strategy to a maximum number of retry attempts.
 * Returns `NaN` once the limit is reached to stop retrying.
 *
 * @example
 * ```ts
 * import { exponential, upto } from '@proventuslabs/retry-strategies';
 *
 * const limited = upto(3, exponential(100, 5000));
 *
 * limited.nextBackoff(); // Returns delay from exponential
 * limited.nextBackoff(); // Returns delay from exponential
 * limited.nextBackoff(); // Returns delay from exponential
 * limited.nextBackoff(); // Returns NaN - no more retries
 * ```
 */
export class UptoBackoff<T extends BackoffStrategy> implements BackoffStrategy {
	private attemptsLeft: number;
	private readonly retries: number;
	private readonly strategy: T;

	/**
	 * Creates a new UptoBackoff instance.
	 *
	 * @param retries - Maximum retry attempts (integer >= 0)
	 * @param strategy - Strategy to wrap
	 * @throws {RangeError} If retries is invalid (NaN, non-integer, or < 0)
	 */
	public constructor(retries: number, strategy: T) {
		if (Number.isNaN(retries)) {
			throw new RangeError(`Retries must not be NaN`);
		}
		if (!Number.isInteger(retries)) {
			throw new RangeError(`Retries must be an integer, received: ${retries}`);
		}
		if (retries < 0) {
			throw new RangeError(
				`Retries must be 0 or greater, received: ${retries}`,
			);
		}

		this.attemptsLeft = retries;
		this.retries = retries;
		this.strategy = strategy;
	}

	/**
	 * Calculate the next backoff delay.
	 * Delegates to the underlying strategy until the limit is reached, then returns `NaN`.
	 *
	 * @returns Delay from underlying strategy, or `NaN` if retries exhausted
	 */
	nextBackoff(): number {
		if (this.attemptsLeft-- <= 0) return NaN;

		return this.strategy.nextBackoff();
	}

	/**
	 * Reset to the initial state.
	 * Resets the retry counter and the underlying strategy.
	 */
	resetBackoff(): void {
		this.attemptsLeft = this.retries;
		this.strategy.resetBackoff();
	}
}

/**
 * Limits a strategy to a maximum number of retry attempts.
 * Returns `NaN` once the limit is reached to stop retrying.
 *
 * @template T - Wrapped strategy
 * @param retries - Maximum retry attempts (integer >= 0)
 * @param strategy - Strategy to wrap
 * @returns Strategy that stops after specified retries
 *
 * @throws {RangeError} If retries is invalid (NaN, non-integer, or < 0)
 */
export const upto = <T extends BackoffStrategy>(
	retries: number,
	strategy: T,
): UptoBackoff<T> => new UptoBackoff(retries, strategy);
