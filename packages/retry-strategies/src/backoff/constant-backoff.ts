import type { BackoffStrategy } from "./interface.ts";

/**
 * Always returns the same delay.
 */
export class ConstantBackoff implements BackoffStrategy {
	private readonly delay: number;

	/**
	 * Creates a new ConstantBackoff instance.
	 *
	 * @param delay - Constant delay in milliseconds (>= 0)
	 * @throws {RangeError} If delay is invalid
	 */
	public constructor(delay: number) {
		if (Number.isNaN(delay)) {
			throw new RangeError(`Delay must not be NaN`);
		}
		if (delay < 0) {
			throw new RangeError(`Delay must be 0 or greater, received: ${delay}`);
		}
		this.delay = delay;
	}

	/**
	 * Calculate the next backoff delay.
	 *
	 * @returns Constant delay in milliseconds
	 */
	public nextBackoff(): number {
		return this.delay;
	}

	/**
	 * Reset to the initial state.
	 */
	public resetBackoff(): void {
		// No-op: ConstantBackoff has no mutable state to reset
	}
}

/**
 * Always returns the same delay.
 *
 * @param delay - Constant delay in milliseconds (>= 0)
 * @returns ConstantBackoff instance
 * @throws {RangeError} If delay is invalid
 */
export const constant = (delay: number): ConstantBackoff =>
	new ConstantBackoff(delay);
