import type { BackoffStrategy } from "./interface.ts";

/**
 * Always returns zero delay for immediate retries.
 */
export class ZeroBackoff implements BackoffStrategy {
	/**
	 * Calculate the next backoff delay.
	 *
	 * @returns Always 0 milliseconds
	 */
	public nextBackoff(): number {
		return 0;
	}

	/**
	 * Reset to the initial state.
	 */
	public resetBackoff(): void {
		// No-op: ZeroBackoff has no state to reset
	}
}

/**
 * Always returns zero delay for immediate retries.
 *
 * @returns ZeroBackoff instance
 */
export const zero = (): ZeroBackoff => new ZeroBackoff();
