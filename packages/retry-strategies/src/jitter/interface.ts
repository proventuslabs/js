/**
 * A strategy for adding jitter (randomization) to a delay.
 */
export interface JitterStrategy {
	/**
	 * Calculate a jitter value in milliseconds for the given base delay.
	 * The returned jitter is typically added to, or used to adjust, the delay.
	 *
	 * @param delay - The current delay in milliseconds.
	 * @returns Jitter in milliseconds.
	 */
	nextJitter: (delay: number) => number;

	/**
	 * Reset to the initial state.
	 */
	resetJitter: () => void;
}
