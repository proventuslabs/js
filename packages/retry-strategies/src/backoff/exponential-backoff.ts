import type { BackoffStrategy } from "./interface.ts";

/**
 * Increases the delay exponentially using the AWS algorithm.
 *
 * Formula: `min(cap, base * 2^n)`
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export class ExponentialBackoff implements BackoffStrategy {
	private readonly base: number;
	private readonly cap: number;
	private attemptCount: number;

	/**
	 * Creates a new ExponentialBackoff instance.
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
	 * @returns Delay in milliseconds: `min(cap, base * 2^n)`
	 */
	public nextBackoff(): number {
		const delay = Math.min(this.cap, this.base * 2 ** this.attemptCount);
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
 * Increases the delay exponentially using the AWS algorithm.
 * Formula: `min(cap, base * 2^n)`
 *
 * @param base - Base delay in milliseconds (>= 0, default: 0)
 * @param cap - Maximum delay in milliseconds (>= base, default: Infinity)
 * @returns ExponentialBackoff instance
 * @throws {RangeError} If base or cap is invalid
 *
 * @see {@link https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ AWS Exponential Backoff And Jitter}
 */
export const exponential = (
	base: number = 0,
	cap: number = Number.POSITIVE_INFINITY,
): ExponentialBackoff => new ExponentialBackoff(base, cap);
