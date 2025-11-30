import type { BackoffStrategy } from "./interface.ts";

/**
 * Increases the delay following the Fibonacci sequence.
 *
 * Formula: `min(cap, base * fib(n))`
 */
export class FibonacciBackoff implements BackoffStrategy {
	private readonly base: number;
	private readonly cap: number;
	private previousDelay: number;
	private currentDelay: number;

	/**
	 * Creates a new FibonacciBackoff instance.
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
		this.previousDelay = 0;
		this.currentDelay = base;
	}

	/**
	 * Calculate the next backoff delay.
	 *
	 * @returns Delay in milliseconds: `min(cap, base * fib(n))`
	 */
	public nextBackoff(): number {
		const delay = Math.min(this.cap, this.currentDelay);

		// Calculate next Fibonacci number
		const nextDelay = this.previousDelay + this.currentDelay;
		this.previousDelay = this.currentDelay;
		this.currentDelay = nextDelay;

		return delay;
	}

	/**
	 * Reset to the initial state.
	 */
	public resetBackoff(): void {
		this.previousDelay = 0;
		this.currentDelay = this.base;
	}
}

/**
 * Increases the delay following the Fibonacci sequence.
 * Formula: `min(cap, base * fib(n))`
 *
 * @param base - Base delay in milliseconds (>= 0)
 * @param cap - Maximum delay in milliseconds (>= base, default: Infinity)
 * @returns FibonacciBackoff instance
 * @throws {RangeError} If base or cap is invalid
 */
export const fibonacci = (
	base: number,
	cap: number = Number.POSITIVE_INFINITY,
): FibonacciBackoff => new FibonacciBackoff(base, cap);
