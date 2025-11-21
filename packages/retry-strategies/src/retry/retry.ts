import type { BackoffStrategy } from "../backoff/interface.ts";
import { waitFor } from "../utils/wait-for.ts";

/**
 * Options for configuring the behavior of the `retry` function.
 */
export type RetryOptions = {
	/**
	 * Strategy for calculating delays between retries.
	 * Should implement `BackoffStrategy`, which typically provides:
	 * - `resetBackoff()`: Resets the backoff sequence.
	 * - `nextBackoff()`: Returns the delay in milliseconds for the next retry.
	 */
	strategy: BackoffStrategy;

	/**
	 * Optional function to determine whether to stop retrying based on the encountered error.
	 *
	 * @param error - The error thrown by the function being retried.
	 * @param attempt - The attempt index for the current retry (0-based, positive integer).
	 * @returns `true` to stop retries, anything else to continue.
	 *
	 * @default () => false
	 */
	stop?: (error: unknown, attempt: number) => boolean;

	/**
	 * Optional AbortSignal to cancel the retry operation.
	 * If the signal is aborted, the `retry` function will immediately reject
	 * with `signal.reason`.
	 *
	 * @default undefined
	 */
	signal?: AbortSignal;
};

/**
 * Attempts to execute a function repeatedly according to a backoff strategy until it succeeds,
 * a provided stop condition is met, or an optional AbortSignal is triggered.
 *
 * @note This method is not concurrently safe as *stateful* strategies might be shared across them.
 *
 * ## Behavior
 *
 * The retry loop continues indefinitely until one of these conditions is met:
 * - The function succeeds
 * - The backoff strategy exhausts its retries (returns `NaN`)
 * - The stop function returns `true`
 * - The abort signal is triggered
 *
 * @template T - The return type of the function being retried.
 * @param fn - The function to retry. Can be synchronous or return a promise.
 * @param options - Configuration options for retrying.
 * @param options.strategy - Backoff strategy used to determine delays between retries.
 * @param options.stop - Optional function called with the error to determine if retrying should stop. Return `true` to stop.
 * @param options.signal - Optional AbortSignal to cancel retries. If aborted, the returned promise is rejected with `signal.reason`.
 * @returns A promise that resolves with the function's result if it eventually succeeds.
 *
 * @throws {unknown} The last encountered error if retries are exhausted or if the stop function returns `true`.
 * @throws {unknown} The reason of the AbortSignal if the operation is aborted (generally {@link DOMException} `AbortError`).
 * @throws {RangeError} If the backoff strategy returns a delay exceeding INT32_MAX (2147483647ms, approximately 24.8 days).
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
	fn: () => T | PromiseLike<T>,
	{ strategy, stop, signal }: RetryOptions,
): Promise<T> => {
	// Reset when we start
	strategy.resetBackoff();

	let attempt = 0;
	while (true) {
		try {
			return fn();
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
