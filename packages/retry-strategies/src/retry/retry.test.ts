import { describe, it, type TestContext } from "node:test";

import type { BackoffStrategy } from "../backoff/interface.ts";
import { retry } from "./retry.ts";

/* node:coverage disable */

describe("retry - Unit tests", () => {
	describe("when function succeeds", () => {
		it("should return result without retrying", async (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => 0),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const successFn = ctx.mock.fn(() => "success");

			// Act
			const result = await retry(successFn, { strategy: mockStrategy });

			// Assert
			ctx.assert.strictEqual(result, "success");
			ctx.assert.strictEqual(successFn.mock.callCount(), 1);
		});
	});

	describe("when function fails", () => {
		it("should retry until succeeds", async (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			let attemptCount = 0;
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => 0),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const flakeyFn = ctx.mock.fn(() => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error("Failed");
				}
				return "success";
			});

			// Act
			const result = await retry(flakeyFn, { strategy: mockStrategy });

			// Assert
			ctx.assert.strictEqual(result, "success");
			ctx.assert.strictEqual(flakeyFn.mock.callCount(), 3);
			ctx.assert.strictEqual(mockStrategy.nextBackoff.mock.callCount(), 2);
		});
	});

	describe("when strategy signals to stop", () => {
		it("should throw error when nextBackoff returns NaN", async (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			let callCount = 0;
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => {
					callCount++;
					return callCount >= 3 ? Number.NaN : 0;
				}),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const failingFn = ctx.mock.fn(() => {
				throw new Error("Failed");
			});

			// Act & Assert
			await ctx.assert.rejects(
				retry(failingFn, { strategy: mockStrategy }),
				(error: Error) => error.message === "Failed",
			);
			ctx.assert.strictEqual(failingFn.mock.callCount(), 3);
		});
	});

	describe("when exit function is provided", () => {
		it("should stop when exit returns true", async (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => 0),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const exitFn = ctx.mock.fn((error: unknown) => {
				return (error as Error).message === "Fatal";
			});

			let attemptCount = 0;
			const failingFn = ctx.mock.fn(() => {
				attemptCount++;
				throw new Error(attemptCount === 2 ? "Fatal" : "Retryable");
			});

			// Act & Assert
			await ctx.assert.rejects(
				retry(failingFn, { strategy: mockStrategy, stop: exitFn }),
				(error: Error) => error.message === "Fatal",
			);
			ctx.assert.strictEqual(failingFn.mock.callCount(), 2);
		});

		it("should continue when exit returns false", async (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => 0),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const exitFn = ctx.mock.fn(() => false);

			let attemptCount = 0;
			const flakeyFn = ctx.mock.fn(() => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error("Retryable");
				}
				return "success";
			});

			// Act
			const result = await retry(flakeyFn, {
				strategy: mockStrategy,
				stop: exitFn,
			});

			// Assert
			ctx.assert.strictEqual(result, "success");
			ctx.assert.strictEqual(exitFn.mock.callCount(), 2);
		});

		it("should pass the correct attempt index to stop", async (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => 0),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const stopFn = ctx.mock.fn((_error: unknown, attempt: number) => {
				// stop after second attempt is triggered
				return attempt === 1;
			});

			const fn = ctx.mock.fn(() => {
				throw new Error("Always fail");
			});

			// Act & Assert
			await ctx.assert.rejects(
				retry(fn, { strategy: mockStrategy, stop: stopFn }),
			);

			// Assert stop was called twice (attempt 0 and attempt 1)
			ctx.assert.deepStrictEqual(stopFn.mock.callCount(), 2);

			// Assert fn was called twice (attempt 0 and attempt 1)
			ctx.assert.strictEqual(fn.mock.callCount(), 2);
		});
	});

	describe("when AbortSignal is provided", () => {
		it("should abort with signal reason", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const controller = new AbortController();
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => 1000),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const failingFn = ctx.mock.fn(() => {
				throw new Error("Failed");
			});

			// Act
			const promise = retry(failingFn, {
				strategy: mockStrategy,
				signal: controller.signal,
			});

			controller.abort(new Error("Aborted"));

			// Assert
			await ctx.assert.rejects(
				promise,
				(error: Error) => error.message === "Aborted",
			);
		});
	});

	describe("when resetting strategy", () => {
		it("should reset strategy before first attempt", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			let resetCalled = false;
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => 0),
				resetBackoff: ctx.mock.fn(() => {
					resetCalled = true;
				}),
			} satisfies BackoffStrategy;

			const checkFn = ctx.mock.fn(() => {
				ctx.assert.strictEqual(resetCalled, true);
				return "done";
			});

			// Act
			await retry(checkFn, { strategy: mockStrategy });
		});
	});
});
