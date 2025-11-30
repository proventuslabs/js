import type { BackoffStrategy } from "./interface.ts";

/**
 * Always returns `NaN` to prevent retries.
 */
export class StopBackoff implements BackoffStrategy {
	/**
	 * Calculate the next backoff delay.
	 *
	 * @returns Always `NaN`
	 */
	public nextBackoff(): number {
		return Number.NaN;
	}

	/**
	 * Reset to the initial state.
	 */
	public resetBackoff(): void {
		// No-op: StopBackoff has no state to reset
	}
}

/**
 * Always returns `NaN` to prevent retries.
 *
 * @returns StopBackoff instance
 */
export const stop = (): StopBackoff => new StopBackoff();
