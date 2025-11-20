import type { BackoffStrategy } from "./interface.ts";

/**
 * A backoff policy that always returns the same backoff delay.
 */
export class ConstantBackoff implements BackoffStrategy {
	private readonly delay: number;

	/**
	 * Creates a new ConstantBackoff instance.
	 *
	 * @param delay - The constant delay in milliseconds to return for each backoff (must be a safe integer)
	 * @throws {RangeError} If delay is not a safe integer or is less than `0`
	 */
	public constructor(delay: number) {
		if (!Number.isSafeInteger(delay)) {
			throw new RangeError(
				`Delay must be a safe integer, received: ${delay}`,
			);
		}
		if (delay < 0) {
			throw new RangeError(`Delay must be 0 or greater, received: ${delay}`);
		}
		this.delay = delay;
	}

	/**
	 * Calculate the next backoff delay.
	 * Always returns the configured constant delay.
	 *
	 * @returns The constant delay in milliseconds
	 */
	public nextBackoff(): number {
		return this.delay;
	}

	/**
	 * Reset to the initial state.
	 * Since ConstantBackoff has no mutable state, this is a no-op.
	 */
	public resetBackoff(): void {
		// No-op: ConstantBackoff has no mutable state to reset
	}
}
