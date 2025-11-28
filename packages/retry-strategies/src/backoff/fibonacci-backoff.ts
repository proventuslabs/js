import type { BackoffStrategy } from "./interface.ts";

/**
 * A backoff policy that increases the delay following the Fibonacci sequence.
 *
 * The delay for each attempt follows: base, base, 2*base, 3*base, 5*base, 8*base, 13*base...
 * The sequence is capped at a maximum delay value.
 */
export class FibonacciBackoff implements BackoffStrategy {
	private readonly base: number;
	private readonly cap: number;
	private previousDelay: number;
	private currentDelay: number;

	/**
	 * Creates a new FibonacciBackoff instance.
	 *
	 * @param base - The base delay in milliseconds (must be >= 0)
	 * @param cap - The maximum delay in milliseconds (must be >= base, defaults to Infinity)
	 * @throws {RangeError} If base or cap is NaN or invalid
	 *
	 * @remarks
	 * After an extremely large number of retry attempts (~90+ iterations),
	 * floating-point precision may be lost in Fibonacci calculations. In practice, this is not
	 * a concern as the cap will have been reached long before precision loss occurs.
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
	 * Returns a delay that follows the Fibonacci sequence, capped at the maximum.
	 *
	 * @returns The next delay in milliseconds following the Fibonacci sequence
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
	 * Resets the Fibonacci sequence to start from the beginning.
	 */
	public resetBackoff(): void {
		this.previousDelay = 0;
		this.currentDelay = this.base;
	}
}
