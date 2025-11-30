import type { BackoffStrategy } from "./interface.ts";

/**
 * A backoff policy that uses the AWS FullJitter algorithm.
 *
 * The delay for attempt n is: random(0, min(cap, base * 2 ** n))
 *
 * This strategy adds randomness to exponential backoff to prevent thundering herd problems
 * where multiple clients retry at the same time.
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export class FullJitterBackoff implements BackoffStrategy {
	private readonly base: number;
	private readonly cap: number;
	private attemptCount: number;

	/**
	 * Creates a new FullJitterBackoff instance.
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
		this.attemptCount = 0;
	}

	/**
	 * Calculate the next backoff delay.
	 * Returns a random delay between 0 and the exponentially increasing maximum.
	 *
	 * @returns The next delay in milliseconds: random(0, min(cap, base * 2 ** attemptCount))
	 */
	public nextBackoff(): number {
		const maxDelay = Math.min(this.cap, this.base * 2 ** this.attemptCount);
		const delay = Math.floor(Math.random() * maxDelay);
		this.attemptCount++;
		return delay;
	}

	/**
	 * Reset to the initial state.
	 * Resets the attempt counter to 0, so the next call to nextBackoff will use attempt 0.
	 */
	public resetBackoff(): void {
		this.attemptCount = 0;
	}
}

/**
 * A backoff policy that uses the AWS FullJitter algorithm.
 * The delay for attempt n is: random(0, min(cap, base * 2 ** n))
 *
 * This strategy adds randomness to exponential backoff to prevent thundering herd problems
 * where multiple clients retry at the same time.
 *
 * @param base - The base delay in milliseconds (must be >= 0)
 * @param cap - The maximum delay in milliseconds (must be >= base, defaults to Infinity)
 * @returns A new FullJitterBackoff instance
 *
 * @throws {RangeError} If base or cap is NaN or invalid
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export const fullJitter = (
	base: number,
	cap: number = Number.POSITIVE_INFINITY,
): FullJitterBackoff => new FullJitterBackoff(base, cap);
