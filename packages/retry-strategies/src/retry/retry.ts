import type { BackoffStrategy } from "../backoff/interface.ts";
import { waitFor } from "../utils/wait-for.ts";

/**
 * Configuration options for the `retry` function.
 */
export type RetryOptions = {
	/**
	 * Delay calculation strategy (required).
	 * Implements `BackoffStrategy` with `nextBackoff()` and `resetBackoff()` methods.
	 */
	strategy: BackoffStrategy;

	/**
	 * Stop condition to determine whether to stop retrying.
	 *
	 * @param error - The error thrown by the function being retried
	 * @param attempt - The attempt index (0-based)
	 * @returns `true` to stop retries, otherwise continues
	 * @default () => false
	 */
	stop?: (error: unknown, attempt: number) => boolean;

	/**
	 * Cancellation signal to abort the retry operation.
	 * If aborted, `retry` rejects with `signal.reason`.
	 *
	 * @default undefined
	 */
	signal?: AbortSignal;
};

/**
 * Executes a function repeatedly according to a backoff strategy until it succeeds, stops, or is aborted.
 *
 * The retry loop continues until: (1) function succeeds, (2) strategy returns `NaN`, (3) stop function returns `true`, or (4) abort signal triggers.
 *
 * @note Not concurrently safe - don't share stateful strategies across concurrent operations.
 *
 * @template T - The return type of the function being retried
 * @param fn - The function to retry
 * @param options - Configuration
 * @param options.strategy - Delay calculation strategy (required)
 * @param options.stop - Stop condition (default: `() => false`)
 * @param options.signal - Cancellation signal (optional)
 * @returns Resolves with the function's result on success
 *
 * @throws {unknown} Last error if retries exhausted, stop condition met, or aborted
 * @throws {RangeError} If delay exceeds INT32_MAX (2147483647ms)
 *
 * @example
 * ```ts
 * import { retry } from "./retry";
 * import { ExponentialBackoff } from "./backoff";
 *
 * const result = await retry(
 *   () => fetch("/api/data").then(res => res.json()),
 *   {
 *     strategy: new ExponentialBackoff({ initial: 100, max: 5000 }),
 *     exit: (error) => error.status === 404, // stop if resource not found
 *   }
 * );
 * console.log(result);
 * ```
 */
export const retry = async <T = unknown>(
	fn: () => T | Promise<T>,
	{ strategy, stop, signal }: RetryOptions,
): Promise<T> => {
	// Reset when we start
	strategy.resetBackoff();

	let attempt = 0;
	while (true) {
		try {
			return await fn();
		} catch (error) {
			// Get next delay
			const delay = strategy.nextBackoff();

			// Stop when strategy says so
			if (Number.isNaN(delay)) throw error;

			// Stop when consumers say so
			if (stop?.(error, attempt++) === true) throw error;

			// Wait for delay and loop again
			await waitFor(delay, signal);
		}
	}
};
