import type { BackoffStrategy } from "./interface.ts";

/**
 * A fixed backoff policy whose backoff time is always zero,
 * meaning that the operation is retried immediately without waiting, indefinitely.
 */
export class ZeroBackoff implements BackoffStrategy {
	/**
	 * Calculate the next backoff delay.
	 * Always returns 0 to retry immediately.
	 *
	 * @returns Always returns 0 milliseconds
	 */
	public nextBackoff(): number {
		return 0;
	}

	/**
	 * Reset to the initial state.
	 * Since ZeroBackoff has no state, this is a no-op.
	 */
	public resetBackoff(): void {
		// No-op: ZeroBackoff has no state to reset
	}
}
