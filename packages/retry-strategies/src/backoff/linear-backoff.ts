import type { BackoffStrategy } from "./interface.ts";

/**
 * Increases the delay linearly by a fixed increment.
 *
 * Formula: `min(cap, initialDelay + (increment * n))`
 */
export class LinearBackoff implements BackoffStrategy {
	private readonly initialDelay: number;
	private readonly increment: number;
	private readonly cap: number;
	private attemptCount: number;

	/**
	 * Creates a new LinearBackoff instance.
	 *
	 * @param increment - Delay increment per retry (>= 0)
	 * @param initialDelay - Initial delay (>= 0, default: 0)
	 * @param cap - Maximum delay (>= initialDelay, default: Infinity)
	 * @throws {RangeError} If parameters are invalid
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
	 *
	 * @returns Delay in milliseconds: `min(cap, initialDelay + (increment * n))`
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
	 */
	public resetBackoff(): void {
		this.attemptCount = 0;
	}
}

/**
 * Increases the delay linearly by a fixed increment.
 * Formula: `min(cap, initialDelay + (increment * n))`
 *
 * @param increment - Delay increment per retry (>= 0)
 * @param initialDelay - Initial delay (>= 0, default: 0)
 * @param cap - Maximum delay (>= initialDelay, default: Infinity)
 * @returns LinearBackoff instance
 * @throws {RangeError} If parameters are invalid
 */
export const linear = (
	increment: number,
	initialDelay = 0,
	cap: number = Number.POSITIVE_INFINITY,
): LinearBackoff => new LinearBackoff(increment, initialDelay, cap);
