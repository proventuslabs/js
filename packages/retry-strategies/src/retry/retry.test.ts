import { describe, suite, type TestContext, test } from "node:test";

import type { BackoffStrategy } from "../backoff/interface.ts";
import { retry } from "./retry.ts";

/* node:coverage disable */

suite("Retry functionality (Unit)", () => {
	describe("successful operation", () => {
		test("returns result without retrying", async (ctx: TestContext) => {
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
			ctx.assert.strictEqual(
				result,
				"success",
				"should return the success result",
			);
			ctx.assert.strictEqual(
				successFn.mock.callCount(),
				1,
				"should call function only once",
			);
		});
	});

	describe("transient failures", () => {
		test("retries until successful", async (ctx: TestContext) => {
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
			ctx.assert.strictEqual(
				result,
				"success",
				"should return success after retries",
			);
			ctx.assert.strictEqual(
				flakeyFn.mock.callCount(),
				3,
				"should call function three times",
			);
			ctx.assert.strictEqual(
				mockStrategy.nextBackoff.mock.callCount(),
				2,
				"should calculate backoff twice",
			);
		});
	});

	describe("strategy exhaustion", () => {
		test("throws the last error", async (ctx: TestContext) => {
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
				"should throw the last error when strategy is exhausted",
			);
			ctx.assert.strictEqual(
				failingFn.mock.callCount(),
				3,
				"should attempt three times before giving up",
			);
		});
	});

	describe("stop condition", () => {
		test("stops retrying and throws error", async (ctx: TestContext) => {
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
				"should throw fatal error when stop condition is met",
			);
			ctx.assert.strictEqual(
				failingFn.mock.callCount(),
				2,
				"should call function twice before stopping",
			);
		});

		test("continues retrying until condition met", async (ctx: TestContext) => {
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
			ctx.assert.strictEqual(
				result,
				"success",
				"should return success after retries",
			);
			ctx.assert.strictEqual(
				exitFn.mock.callCount(),
				2,
				"should check stop condition for each error",
			);
		});

		test("provides attempt index to stop function", async (ctx: TestContext) => {
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
				"should throw error when stop condition is met",
			);

			// Assert stop was called twice (attempt 0 and attempt 1)
			ctx.assert.deepStrictEqual(
				stopFn.mock.callCount(),
				2,
				"should call stop function twice",
			);

			// Assert fn was called twice (attempt 0 and attempt 1)
			ctx.assert.strictEqual(
				fn.mock.callCount(),
				2,
				"should call function twice",
			);
		});
	});

	describe("operation abortion", () => {
		test("rejects with abort reason", async (ctx: TestContext) => {
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
				"should reject with abort reason",
			);
		});
	});

	describe("strategy initialization", () => {
		test("resets strategy state before first attempt", async (ctx: TestContext) => {
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
				ctx.assert.strictEqual(
					resetCalled,
					true,
					"should have reset strategy before first attempt",
				);
				return "done";
			});

			// Act
			await retry(checkFn, { strategy: mockStrategy });
		});
	});

	describe("delay exceeds INT32_MAX", () => {
		test("fails in waitFor", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const INT32_MAX = 2 ** 31 - 1;
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => INT32_MAX + 1),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const failingFn = ctx.mock.fn(() => {
				throw new Error("Failed");
			});

			// Act & Assert
			await ctx.assert.rejects(
				retry(failingFn, { strategy: mockStrategy }),
				(error: Error) => {
					return (
						error instanceof RangeError &&
						error.message.includes("Delay must not exceed")
					);
				},
				"should throw RangeError when delay exceeds INT32_MAX",
			);
		});

		test("fails with delay value in message", async (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const INT32_MAX = 2 ** 31 - 1;
			const excessiveDelay = 3000000000;
			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => excessiveDelay),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const failingFn = ctx.mock.fn(() => {
				throw new Error("Failed");
			});

			// Act & Assert
			await ctx.assert.rejects(
				retry(failingFn, { strategy: mockStrategy }),
				(error: Error) => {
					return (
						error instanceof RangeError &&
						error.message.includes(`${INT32_MAX}`) &&
						error.message.includes(`${excessiveDelay}`)
					);
				},
				"should include both INT32_MAX and actual delay in error message",
			);
		});
	});

	describe("delay equals INT32_MAX", () => {
		test("does not fail", async (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			ctx.mock.timers.enable({ apis: ["setTimeout"] });
			const INT32_MAX = 2 ** 31 - 1;
			let attemptCount = 0;

			const mockStrategy = {
				nextBackoff: ctx.mock.fn(() => INT32_MAX),
				resetBackoff: ctx.mock.fn(),
			} satisfies BackoffStrategy;

			const flakeyFn = ctx.mock.fn(() => {
				attemptCount++;
				if (attemptCount < 2) {
					throw new Error("Failed");
				}
				return "success";
			});

			// Act
			const promise = retry(flakeyFn, { strategy: mockStrategy });
			ctx.mock.timers.tick(INT32_MAX);
			const result = await promise;

			// Assert
			ctx.assert.strictEqual(
				result,
				"success",
				"should return success after delay",
			);
			ctx.assert.strictEqual(
				flakeyFn.mock.callCount(),
				2,
				"should retry once with INT32_MAX delay",
			);
		});
	});
});
