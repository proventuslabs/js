/**
 * Maximum safe delay value for setTimeout (2^31 - 1 milliseconds, approximately 24.8 days).
 * Values exceeding this will cause setTimeout to wrap around and behave unexpectedly.
 */
export const INT32_MAX = 0x7fffffff;

/**
 * Waits for a specified duration or until aborted.
 *
 * @param delay - Wait duration in milliseconds (negative treated as zero)
 * @param signal - Cancellation signal (optional)
 * @returns Resolves after delay or rejects if aborted
 *
 * @throws {unknown} Abort reason if cancelled
 * @throws {RangeError} If delay exceeds INT32_MAX (2147483647ms)
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

	if (signal?.aborted === true) return Promise.reject(signal.reason);

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
