/**
 * A strategy for retrying an operation.
 */
export interface BackoffStrategy {
	/**
	 * Calculate the next backoff delay in milliseconds.
	 * `NaN` means that no further retries should be made.
	 *
	 * @returns Backoff delay in milliseconds, or `NaN` to stop retrying
	 */
	nextBackoff: () => number;

	/**
	 * Reset to the initial state.
	 */
	resetBackoff: () => void;
}
