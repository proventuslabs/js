import { describe, suite, type TestContext, test } from "node:test";

import { ExponentialBackoff } from "../backoff/exponential-backoff.ts";
import type { BackoffStrategy } from "../backoff/interface.ts";
import { UptoBackoff, upto } from "./upto.ts";

/* node:coverage disable */

suite("Up to retry limiter (Unit)", () => {
	describe("retry limit enforcement", () => {
		test("returns delays up to the limit", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};
			const limited = upto(3, mockStrategy);

			// Act & Assert
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				1000,
				"should return delay on first call",
			);
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				1000,
				"should return delay on second call",
			);
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				1000,
				"should return delay on third call",
			);
		});

		test("returns NaN after exhausting retries", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};
			const limited = upto(2, mockStrategy);

			// Act
			limited.nextBackoff();
			limited.nextBackoff();
			const result1 = limited.nextBackoff();
			const result2 = limited.nextBackoff();

			// Assert
			ctx.assert.ok(
				Number.isNaN(result1),
				"should return NaN on first excess call",
			);
			ctx.assert.ok(
				Number.isNaN(result2),
				"should return NaN on second excess call",
			);
			ctx.assert.strictEqual(
				result1,
				result1,
				"NaN should equal itself (identity check)",
			);
			ctx.assert.notStrictEqual(result1, 1000, "NaN should not equal a number");
		});

		test("supports zero retries", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};
			const limited = upto(0, mockStrategy);

			// Act
			const result1 = limited.nextBackoff();
			const result2 = limited.nextBackoff();

			// Assert
			ctx.assert.ok(
				Number.isNaN(result1),
				"should return NaN immediately with zero retries",
			);
			ctx.assert.ok(Number.isNaN(result2), "should continue returning NaN");
		});
	});

	describe("delegation to underlying strategy", () => {
		test("delegates nextBackoff calls", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			let callCount = 0;
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => {
					callCount++;
					return callCount * 100;
				},
				resetBackoff: () => {},
			};
			const limited = upto(3, mockStrategy);

			// Act & Assert
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				100,
				"should delegate first call to underlying strategy",
			);
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				200,
				"should delegate second call to underlying strategy",
			);
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				300,
				"should delegate third call to underlying strategy",
			);
		});

		test("stops delegating after limit is reached", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			let callCount = 0;
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => {
					callCount++;
					return 1000;
				},
				resetBackoff: () => {},
			};
			const limited = upto(2, mockStrategy);

			// Act
			limited.nextBackoff();
			limited.nextBackoff();
			limited.nextBackoff();

			// Assert
			ctx.assert.strictEqual(
				callCount,
				2,
				"should only call underlying strategy twice",
			);

			limited.nextBackoff();
			ctx.assert.strictEqual(
				callCount,
				2,
				"should not call underlying strategy after limit",
			);
		});
	});

	describe("strategy reset", () => {
		test("resets retry counter", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};
			const limited = upto(2, mockStrategy);

			// Act & Assert
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				1000,
				"should return delay before exhaustion",
			);
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				1000,
				"should return delay before exhaustion",
			);
			ctx.assert.ok(
				Number.isNaN(limited.nextBackoff()),
				"should return NaN after exhaustion",
			);

			limited.resetBackoff();

			ctx.assert.strictEqual(
				limited.nextBackoff(),
				1000,
				"should return delay after reset",
			);
		});

		test("delegates reset to underlying strategy", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			let resetCalled = false;
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {
					resetCalled = true;
				},
			};
			const limited = upto(3, mockStrategy);

			// Act
			limited.resetBackoff();

			// Assert
			ctx.assert.strictEqual(
				resetCalled,
				true,
				"should delegate reset to underlying strategy",
			);
		});

		test("fully restores retry capacity", (ctx: TestContext) => {
			ctx.plan(7);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 500,
				resetBackoff: () => {},
			};
			const limited = upto(2, mockStrategy);

			// Act - First cycle
			ctx.assert.strictEqual(limited.nextBackoff(), 500, "should return delay");
			ctx.assert.strictEqual(limited.nextBackoff(), 500, "should return delay");
			ctx.assert.ok(Number.isNaN(limited.nextBackoff()), "should return NaN");

			// Reset
			limited.resetBackoff();

			// Act - Second cycle
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				500,
				"should return delay after reset",
			);
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				500,
				"should return delay after reset",
			);
			ctx.assert.ok(
				Number.isNaN(limited.nextBackoff()),
				"should return NaN after reset cycle",
			);

			// Assert - Can reset again
			limited.resetBackoff();
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				500,
				"should return delay after second reset",
			);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent retry counters", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};
			const limited1 = upto(1, mockStrategy);
			const limited2 = upto(3, mockStrategy);

			// Act & Assert
			ctx.assert.strictEqual(
				limited1.nextBackoff(),
				1000,
				"should return delay for first instance",
			);
			ctx.assert.ok(
				Number.isNaN(limited1.nextBackoff()),
				"should exhaust first instance",
			);

			ctx.assert.strictEqual(
				limited2.nextBackoff(),
				1000,
				"should return delay for second instance",
			);
			ctx.assert.strictEqual(
				limited2.nextBackoff(),
				1000,
				"should not affect second instance",
			);
		});

		test("resets independently", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};
			const limited1 = upto(1, mockStrategy);
			const limited2 = upto(1, mockStrategy);

			// Act
			limited1.nextBackoff();
			limited2.nextBackoff();

			// Assert - Both exhausted
			ctx.assert.ok(
				Number.isNaN(limited1.nextBackoff()),
				"should exhaust first instance",
			);
			ctx.assert.ok(
				Number.isNaN(limited2.nextBackoff()),
				"should exhaust second instance",
			);

			// Reset only first
			limited1.resetBackoff();

			// Assert - Only first restored
			ctx.assert.strictEqual(
				limited1.nextBackoff(),
				1000,
				"should restore first instance",
			);
			ctx.assert.ok(
				Number.isNaN(limited2.nextBackoff()),
				"should not affect second instance",
			);
		});
	});

	describe("parameter validation", () => {
		test("rejects non-integer retry values", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};

			// Act & Assert
			ctx.assert.throws(
				() => upto(0.5, mockStrategy),
				RangeError,
				"should reject fractional retries",
			);
			ctx.assert.throws(
				() => upto(Number.NaN, mockStrategy),
				RangeError,
				"should reject NaN retries",
			);
			ctx.assert.throws(
				() => upto(Number.POSITIVE_INFINITY, mockStrategy),
				RangeError,
				"should reject infinite retries",
			);
		});

		test("rejects negative retry values", (ctx: TestContext) => {
			ctx.plan(1);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};

			// Act & Assert
			ctx.assert.throws(
				() => upto(-1, mockStrategy),
				RangeError,
				"should reject negative retries",
			);
		});

		test("accepts valid retry values", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 1000,
				resetBackoff: () => {},
			};

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => upto(0, mockStrategy),
				"should accept zero retries",
			);
			ctx.assert.doesNotThrow(
				() => upto(100, mockStrategy),
				"should accept positive retries",
			);
			ctx.assert.doesNotThrow(
				() => upto(Number.MAX_SAFE_INTEGER, mockStrategy),
				"should accept MAX_SAFE_INTEGER retries",
			);
		});
	});

	describe("edge cases", () => {
		test("handles strategy returning NaN", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => Number.NaN,
				resetBackoff: () => {},
			};
			const limited = upto(3, mockStrategy);

			// Act
			const result1 = limited.nextBackoff();
			const result2 = limited.nextBackoff();

			// Assert
			ctx.assert.ok(
				Number.isNaN(result1),
				"should propagate NaN from underlying strategy",
			);
			ctx.assert.ok(Number.isNaN(result2), "should continue propagating NaN");
		});

		test("handles large retry counts", (ctx: TestContext) => {
			ctx.plan(2);

			// Arrange
			const mockStrategy: BackoffStrategy = {
				nextBackoff: () => 100,
				resetBackoff: () => {},
			};
			const limited = upto(1000000, mockStrategy);

			// Act
			for (let i = 0; i < 999999; i++) {
				limited.nextBackoff();
			}

			// Assert
			ctx.assert.strictEqual(
				limited.nextBackoff(),
				100,
				"should return delay on last allowed retry",
			);
			ctx.assert.ok(
				Number.isNaN(limited.nextBackoff()),
				"should return NaN after large retry count",
			);
		});
	});

	describe("factory function", () => {
		test("creates UptoBackoff instance", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const exponential = new ExponentialBackoff(100, 5000);

			// Act
			const strategy = upto(3, exponential);

			// Assert
			ctx.assert.ok(
				strategy instanceof UptoBackoff,
				"should return UptoBackoff instance",
			);
			ctx.assert.strictEqual(
				strategy.nextBackoff(),
				100,
				"should work correctly",
			);
			ctx.assert.strictEqual(
				strategy.nextBackoff(),
				200,
				"should maintain state correctly",
			);
		});
	});
});
