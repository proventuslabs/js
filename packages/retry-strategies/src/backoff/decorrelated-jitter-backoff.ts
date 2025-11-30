import type { BackoffStrategy } from "./interface.ts";

/**
 * AWS DecorrelatedJitter algorithm - each delay based on previous delay.
 * Decorrelates retry attempts to avoid synchronization between clients.
 * Generally results in shorter overall wait times.
 *
 * Formula: `min(cap, random(base, previousDelay * 3))`
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
		this.previousDelay = base;
	}

	/**
	 * Calculate the next backoff delay.
	 *
	 * @returns Random delay in milliseconds: `min(cap, random(base, previousDelay * 3))`
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
	 */
	public resetBackoff(): void {
		this.previousDelay = this.base;
	}
}

/**
 * AWS DecorrelatedJitter algorithm - each delay based on previous delay.
 * Formula: `min(cap, random(base, previousDelay * 3))`
 *
 * Decorrelates retry attempts to avoid synchronization between clients.
 * Generally results in shorter overall wait times.
 *
 * @param base - Base delay in milliseconds (>= 0, default: 0)
 * @param cap - Maximum delay in milliseconds (>= base, default: Infinity)
 * @returns DecorrelatedJitterBackoff instance
 * @throws {RangeError} If base or cap is invalid
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export const decorrelatedJitter = (
	base: number = 0,
	cap: number = Number.POSITIVE_INFINITY,
): DecorrelatedJitterBackoff => new DecorrelatedJitterBackoff(base, cap);
