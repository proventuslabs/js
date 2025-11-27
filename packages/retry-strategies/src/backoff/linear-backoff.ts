import type { BackoffStrategy } from "./interface.ts";

/**
 * A backoff policy that increases the delay linearly by a fixed increment on each retry.
 *
 * The delay for attempt n is: min(cap, initialDelay + (increment * n))
 */
export class LinearBackoff implements BackoffStrategy {
	private readonly initialDelay: number;
	private readonly increment: number;
	private readonly cap: number;
	private attemptCount: number;

	/**
	 * Creates a new LinearBackoff instance.
	 *
	 * @param increment - The amount to increase the delay by on each retry (must be >= 0)
	 * @param initialDelay - The initial delay in milliseconds before any increments (must be >= 0, defaults to 0)
	 * @param cap - The maximum delay in milliseconds (must be >= initialDelay, defaults to Infinity)
	 * @throws {RangeError} If increment, initialDelay, or cap is NaN or invalid
	 */
	public constructor(
		increment: number,
		initialDelay = 0,
		cap: number = Number.POSITIVE_INFINITY,
	) {
		if (Number.isNaN(increment)) {
			throw new RangeError(`Increment must not be NaN`);
		}
		if (increment < 0) {
			throw new RangeError(
				`Increment must be 0 or greater, received: ${increment}`,
			);
		}

		if (Number.isNaN(initialDelay)) {
			throw new RangeError(`Initial delay must not be NaN`);
		}
		if (initialDelay < 0) {
			throw new RangeError(
				`Initial delay must be 0 or greater, received: ${initialDelay}`,
			);
		}

		if (Number.isNaN(cap)) {
			throw new RangeError(`Cap must not be NaN`);
		}
		if (cap < initialDelay) {
			throw new RangeError(
				`Cap must be greater than or equal to initial delay, received cap: ${cap}, initial delay: ${initialDelay}`,
			);
		}

		this.initialDelay = initialDelay;
		this.increment = increment;
		this.cap = cap;
		this.attemptCount = 0;
	}

	/**
	 * Calculate the next backoff delay.
	 * Returns a delay that increases linearly with each call, capped at the maximum.
	 *
	 * @returns The next delay in milliseconds: min(cap, initialDelay + (increment * attemptCount))
	 */
	public nextBackoff(): number {
		const delay = Math.min(
			this.cap,
			this.initialDelay + this.increment * this.attemptCount,
		);
		this.attemptCount++;
		return delay;
	}

	/**
	 * Reset to the initial state.
	 * Resets the attempt counter to 0, so the next call to nextBackoff will return the initial delay.
	 */
	public resetBackoff(): void {
		this.attemptCount = 0;
	}
}
