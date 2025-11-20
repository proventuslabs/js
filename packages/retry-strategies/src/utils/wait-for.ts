/**
 * Waits for the specified amount of time or until an optional AbortSignal is triggered.
 *
 * @param delay - Duration to wait in milliseconds. Negative values are treated as zero.
 * @param signal - Optional AbortSignal to cancel the wait. If the signal is aborted, the returned promise is rejected with `signal.reason`.
 * @returns A promise that resolves after the delay has elapsed or rejects if the signal is aborted.
 *
 * @example
 * ```ts
 * await waitFor(1000); // waits 1 second
 *
 * const controller = new AbortController();
 * const promise = waitFor(5000, controller.signal);
 * controller.abort(); // promise rejects immediately
 * ```
 */
export const waitFor = (delay: number, signal?: AbortSignal): Promise<void> => {
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
