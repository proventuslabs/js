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
	 * @param base - The base delay in milliseconds (must be a safe integer >= 0)
	 * @param cap - The maximum delay in milliseconds (must be a safe integer >= base, defaults to MAX_SAFE_INTEGER)
	 * @throws {RangeError} If base or cap is not a safe integer or is invalid
	 */
	public constructor(base: number, cap: number = Number.MAX_SAFE_INTEGER) {
		if (!Number.isSafeInteger(base)) {
			throw new RangeError(`Base must be a safe integer, received: ${base}`);
		}
		if (base < 0) {
			throw new RangeError(`Base must be 0 or greater, received: ${base}`);
		}

		if (!Number.isSafeInteger(cap)) {
			throw new RangeError(`Cap must be a safe integer, received: ${cap}`);
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
