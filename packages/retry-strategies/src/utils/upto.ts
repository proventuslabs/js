import type { BackoffStrategy } from "../backoff/interface.ts";

/**
 * Limits a backoff strategy to a maximum number of retry attempts.
 * Once the limit is reached, `nextBackoff()` returns `NaN` to stop retrying.
 *
 * @example
 * ```ts
 * import { ExponentialBackoff, UptoBackoff } from '@proventuslabs/retry-strategies';
 *
 * const exponential = new ExponentialBackoff(100, 5000);
 * const limited = new UptoBackoff(3, exponential);
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
	 * @param retries - Maximum number of retry attempts allowed (must be >= 0 and an integer)
	 * @param strategy - The underlying backoff strategy to wrap
	 * @throws {RangeError} If retries is NaN, not an integer, or less than 0
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
	 * Returns the delay from the underlying strategy until the retry limit is reached,
	 * then returns NaN to stop retrying.
	 *
	 * @returns The next delay in milliseconds from the underlying strategy, or NaN if retries exhausted
	 */
	nextBackoff(): number {
		if (this.attemptsLeft-- <= 0) return NaN;

		return this.strategy.nextBackoff();
	}

	/**
	 * Reset to the initial state.
	 * Resets both the retry counter and the underlying strategy.
	 */
	resetBackoff(): void {
		this.attemptsLeft = this.retries;
		this.strategy.resetBackoff();
	}
}

/**
 * Limits a backoff strategy to a maximum number of retry attempts.
 * Once the limit is reached, `nextBackoff()` returns `NaN` to stop retrying.
 *
 * @param retries - Maximum number of retry attempts allowed (must be >= 0 and an integer)
 * @param strategy - The underlying backoff strategy to wrap
 * @returns A new UptoBackoff instance that stops after the specified number of retries
 *
 * @throws {RangeError} If retries is NaN, not an integer, or less than 0
 */
export const upto = <T extends BackoffStrategy>(
	retries: number,
	strategy: T,
): UptoBackoff<T> => new UptoBackoff(retries, strategy);
