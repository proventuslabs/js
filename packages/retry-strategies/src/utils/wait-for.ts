/**
 * Maximum safe delay value for setTimeout (2^31 - 1 milliseconds, approximately 24.8 days).
 * Values exceeding this will cause setTimeout to wrap around and behave unexpectedly.
 */
export const INT32_MAX = 0x7fffffff;

/**
 * Waits for the specified amount of time or until an optional AbortSignal is triggered.
 *
 * @param delay - Duration to wait in milliseconds. Negative values are treated as zero.
 * @param signal - Optional AbortSignal to cancel the wait. If the signal is aborted, the returned promise is rejected with `signal.reason`.
 * @returns A promise that resolves after the delay has elapsed or rejects if the signal is aborted.
 *
 * @throws {RangeError} If the delay exceeds INT32_MAX (2147483647ms, approximately 24.8 days).
 *
 * @example
 * ```ts
 * await waitFor(1000); // waits 1 second
 *
 * const controller = new AbortController();
 * const promise = waitFor(5000, controller.signal);
 * controller.abort(); // promise rejects immediately
 *
 * // Throws RangeError - delay too large
 * await waitFor(2147483648);
 * ```
 */
export const waitFor = (delay: number, signal?: AbortSignal): Promise<void> => {
	if (delay > INT32_MAX) {
		throw new RangeError(
			`Delay must not exceed INT32_MAX: expected up to ${INT32_MAX}, received ${delay}`,
		);
	}

	return new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", listener);
			resolve();
		}, delay);

		const listener: EventListener = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};

		signal?.addEventListener("abort", listener);
	});
};
