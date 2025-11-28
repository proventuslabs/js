import type { BackoffStrategy } from "./interface.ts";

/**
 * A backoff policy that uses the AWS EqualJitter algorithm.
 *
 * The delay for attempt n is: temp = min(cap, base * 2 ** n), then delay = temp / 2 + random(0, temp / 2)
 *
 * This strategy balances between consistent delays and randomness to prevent thundering herd problems
 * while maintaining more predictable timing than FullJitter.
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export class EqualJitterBackoff implements BackoffStrategy {
	private readonly base: number;
	private readonly cap: number;
	private attemptCount: number;

	/**
	 * Creates a new EqualJitterBackoff instance.
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
	 * Returns a delay that is half deterministic and half random.
	 *
	 * @returns The next delay in milliseconds: temp / 2 + random(0, temp / 2), where temp = min(cap, base * 2 ** attemptCount)
	 */
	public nextBackoff(): number {
		const temp = Math.min(this.cap, this.base * 2 ** this.attemptCount);
		const half = temp / 2;
		const delay = Math.floor(half + Math.random() * half);
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
