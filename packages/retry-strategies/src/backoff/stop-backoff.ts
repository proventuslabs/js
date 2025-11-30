import type { BackoffStrategy } from "./interface.ts";

/**
 * A fixed backoff policy that always returns NaN for nextBackoff(),
 * meaning that the operation should never be retried.
 */
export class StopBackoff implements BackoffStrategy {
	/**
	 * Calculate the next backoff delay.
	 * Always returns NaN to indicate no retries should be made.
	 *
	 * @returns Always returns NaN to signal no retry
	 */
	public nextBackoff(): number {
		return Number.NaN;
	}

	/**
	 * Reset to the initial state.
	 * Since StopBackoff has no state, this is a no-op.
	 */
	public resetBackoff(): void {
		// No-op: StopBackoff has no state to reset
	}
}

/**
 * A fixed backoff policy that always returns NaN for nextBackoff(),
 * meaning that the operation should never be retried.
 *
 * @returns A new StopBackoff instance
 */
export const stop = (): StopBackoff => new StopBackoff();
