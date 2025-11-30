import type { BackoffStrategy } from "./interface.ts";

/**
 * AWS FullJitter algorithm - adds randomness to exponential backoff.
 * Prevents thundering herd problems where multiple clients retry simultaneously.
 *
 * Formula: `random(0, min(cap, base * 2^n))`
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
	 * @param base - Base delay in milliseconds (>= 0)
	 * @param cap - Maximum delay in milliseconds (>= base, default: Infinity)
	 * @throws {RangeError} If base or cap is invalid
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
	 *
	 * @returns Random delay in milliseconds: `random(0, min(cap, base * 2^n))`
	 */
	public nextBackoff(): number {
		const maxDelay = Math.min(this.cap, this.base * 2 ** this.attemptCount);
		const delay = Math.floor(Math.random() * maxDelay);
		this.attemptCount++;
		return delay;
	}

	/**
	 * Reset to the initial state.
	 */
	public resetBackoff(): void {
		this.attemptCount = 0;
	}
}

/**
 * AWS FullJitter algorithm - adds randomness to exponential backoff.
 * Formula: `random(0, min(cap, base * 2^n))`
 *
 * Prevents thundering herd problems where multiple clients retry simultaneously.
 *
 * @param base - Base delay in milliseconds (>= 0)
 * @param cap - Maximum delay in milliseconds (>= base, default: Infinity)
 * @returns FullJitterBackoff instance
 * @throws {RangeError} If base or cap is invalid
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export const fullJitter = (
	base: number,
	cap: number = Number.POSITIVE_INFINITY,
): FullJitterBackoff => new FullJitterBackoff(base, cap);
