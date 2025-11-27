import type { BackoffStrategy } from "../backoff/interface.ts";

/**
 * Limits a backoff strategy to a maximum number of retry attempts.
 * Once the limit is reached, `nextBackoff()` returns `NaN` to stop retrying.
 *
 * @param retries - Maximum number of retry attempts allowed (must be >= 0 and an integer)
 * @param strategy - The underlying backoff strategy to wrap
 * @returns A new BackoffStrategy that stops after the specified number of retries
 *
 * @throws {RangeError} If retries is NaN, not an integer, or less than 0
 *
 * @example
 * ```ts
 * const exponential = new ExponentialBackoff(100, 5000);
 * const limited = upto(3, exponential); // Only allow 3 retries
 *
 * limited.nextBackoff(); // Returns delay from exponential
 * limited.nextBackoff(); // Returns delay from exponential
 * limited.nextBackoff(); // Returns delay from exponential
 * limited.nextBackoff(); // Returns NaN - no more retries
 * ```
 */
export const upto = (
	retries: number,
	strategy: BackoffStrategy,
): BackoffStrategy => {
	if (Number.isNaN(retries)) {
		throw new RangeError(`Retries must not be NaN`);
	}
	if (!Number.isInteger(retries)) {
		throw new RangeError(`Retries must be an integer, received: ${retries}`);
	}
	if (retries < 0) {
		throw new RangeError(`Retries must be 0 or greater, received: ${retries}`);
	}

	let attemptsLeft = retries;

	return {
		nextBackoff() {
			if (attemptsLeft-- <= 0) return NaN;

			return strategy.nextBackoff();
		},
		resetBackoff() {
			attemptsLeft = retries;
			strategy.resetBackoff();
		},
	};
};
