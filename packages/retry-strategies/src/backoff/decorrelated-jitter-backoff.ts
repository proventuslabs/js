import type { BackoffStrategy } from "./interface.ts";

/**
 * A backoff policy that uses the AWS DecorrelatedJitter algorithm.
 *
 * The delay for attempt n is: min(cap, random(base, previous_delay * 3))
 *
 * This strategy decorrelates the retry attempts from each other, making the delays
 * unpredictable and helping to avoid synchronization between multiple clients.
 * It generally results in shorter overall wait times compared to other strategies.
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export class DecorrelatedJitterBackoff implements BackoffStrategy {
	private readonly base: number;
	private readonly cap: number;
	private previousDelay: number;

	/**
	 * Creates a new DecorrelatedJitterBackoff instance.
	 *
	 * @param base - The base delay in milliseconds (must be >= 0)
	 * @param cap - The maximum delay in milliseconds (must be >= base, defaults to Infinity)
	 * @throws {RangeError} If base or cap is NaN or invalid
	 */
	public constructor(base: number, cap: number = Number.POSITIVE_INFINITY) {
		if (Number.isNaN(base)) {
			throw new RangeError(`Base must not be NaN`);
		}
		if (base < 0) {
			throw new RangeError(`Base must be 0 or greater, received: ${base}`);
		}

		if (Number.isNaN(cap)) {
			throw new RangeError(`Cap must not be NaN`);
		}
		if (cap < base) {
			throw new RangeError(
				`Cap must be greater than or equal to base, received cap: ${cap}, base: ${base}`,
			);
		}

		this.base = base;
		this.cap = cap;
		this.previousDelay = base;
	}

	/**
	 * Calculate the next backoff delay.
	 * Returns a random delay between base and triple the previous delay, capped at maximum.
	 *
	 * @returns The next delay in milliseconds: min(cap, random(base, previous_delay * 3))
	 */
	public nextBackoff(): number {
		const upperBound = this.previousDelay * 3;
		const randomDelay = Math.floor(
			this.base + Math.random() * (upperBound - this.base),
		);
		const delay = Math.min(this.cap, randomDelay);
		this.previousDelay = delay;
		return delay;
	}

	/**
	 * Reset to the initial state.
	 * Resets the previous delay to the base delay.
	 */
	public resetBackoff(): void {
		this.previousDelay = this.base;
	}
}

/**
 * A backoff policy that uses the AWS DecorrelatedJitter algorithm.
 * The delay for attempt n is: min(cap, random(base, previous_delay * 3))
 *
 * This strategy decorrelates the retry attempts from each other, making the delays
 * unpredictable and helping to avoid synchronization between multiple clients.
 * It generally results in shorter overall wait times compared to other strategies.
 *
 * @param base - The base delay in milliseconds (must be >= 0)
 * @param cap - The maximum delay in milliseconds (must be >= base, defaults to Infinity)
 * @returns A new DecorrelatedJitterBackoff instance
 *
 * @throws {RangeError} If base or cap is NaN or invalid
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export const decorrelatedJitter = (
	base: number,
	cap: number = Number.POSITIVE_INFINITY,
): DecorrelatedJitterBackoff => new DecorrelatedJitterBackoff(base, cap);
