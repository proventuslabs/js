import type { BackoffStrategy } from "./interface.ts";

/**
 * A backoff policy that increases the delay linearly by a fixed increment on each retry.
 *
 * The delay for attempt n is: initialDelay + (increment * n)
 */
export class LinearBackoff implements BackoffStrategy {
	private readonly initialDelay: number;
	private readonly increment: number;
	private attemptCount: number;

	/**
	 * Creates a new LinearBackoff instance.
	 *
	 * @param increment - The amount to increase the delay by on each retry (must be a safe integer >= 0)
	 * @param initialDelay - The initial delay in milliseconds before any increments (must be a safe integer >= 0, defaults to 0)
	 * @throws {RangeError} If increment or initialDelay is not a safe integer or is less than 0
	 */
	public constructor(increment: number, initialDelay = 0) {
		if (!Number.isSafeInteger(increment)) {
			throw new RangeError(
				`Increment must be a safe integer, received: ${increment}`,
			);
		}
		if (increment < 0) {
			throw new RangeError(
				`Increment must be 0 or greater, received: ${increment}`,
			);
		}

		if (!Number.isSafeInteger(initialDelay)) {
			throw new RangeError(
				`Initial delay must be a safe integer, received: ${initialDelay}`,
			);
		}
		if (initialDelay < 0) {
			throw new RangeError(
				`Initial delay must be 0 or greater, received: ${initialDelay}`,
			);
		}

		this.initialDelay = initialDelay;
		this.increment = increment;
		this.attemptCount = 0;
	}

	/**
	 * Calculate the next backoff delay.
	 * Returns a delay that increases linearly with each call.
	 *
	 * @returns The next delay in milliseconds: initialDelay + (increment * attemptCount)
	 */
	public nextBackoff(): number {
		const delay = this.initialDelay + this.increment * this.attemptCount;
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