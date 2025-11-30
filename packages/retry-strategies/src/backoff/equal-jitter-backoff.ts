import type { BackoffStrategy } from "./interface.ts";

/**
 * AWS EqualJitter algorithm - balances consistency and randomness.
 * Provides more predictable timing than FullJitter while still preventing thundering herd.
 *
 * Formula: `(min(cap, base * 2^n) / 2) + random(0, min(cap, base * 2^n) / 2)`
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
	 * @param base - Base delay in milliseconds (>= 0, default: 0)
	 * @param cap - Maximum delay in milliseconds (>= base, default: Infinity)
	 * @throws {RangeError} If base or cap is invalid
	 */
	public constructor(base: number = 0, cap: number = Number.POSITIVE_INFINITY) {
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
	 * @returns Delay in milliseconds: `(temp / 2) + random(0, temp / 2)` where `temp = min(cap, base * 2^n)`
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
	 */
	public resetBackoff(): void {
		this.attemptCount = 0;
	}
}

/**
 * AWS EqualJitter algorithm - balances consistency and randomness.
 * Formula: `(min(cap, base * 2^n) / 2) + random(0, min(cap, base * 2^n) / 2)`
 *
 * Provides more predictable timing than FullJitter while still preventing thundering herd.
 *
 * @param base - Base delay in milliseconds (>= 0, default: 0)
 * @param cap - Maximum delay in milliseconds (>= base, default: Infinity)
 * @returns EqualJitterBackoff instance
 * @throws {RangeError} If base or cap is invalid
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export const equalJitter = (
	base: number = 0,
	cap: number = Number.POSITIVE_INFINITY,
): EqualJitterBackoff => new EqualJitterBackoff(base, cap);
