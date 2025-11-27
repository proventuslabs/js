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
