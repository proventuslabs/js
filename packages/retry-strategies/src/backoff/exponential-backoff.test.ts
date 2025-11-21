import { describe, suite, type TestContext, test } from "node:test";

import { ExponentialBackoff } from "./exponential-backoff.ts";

/* node:coverage disable */
suite("Exponential backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("increases delay exponentially", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new ExponentialBackoff(100, 10000);

			// Act & Assert
			// delay = min(10000, 100 * 2^n)
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return 100ms on first call",
			); // 100 * 2^0 = 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return 200ms on second call",
			); // 100 * 2^1 = 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should return 400ms on third call",
			); // 100 * 2^2 = 400
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				800,
				"should return 800ms on fourth call",
			); // 100 * 2^3 = 800
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1600,
				"should return 1600ms on fifth call",
			); // 100 * 2^4 = 1600
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				3200,
				"should return 3200ms on sixth call",
			); // 100 * 2^5 = 3200
		});

		test("caps delay at maximum value", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new ExponentialBackoff(100, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return 100ms before cap",
			); // 100 * 2^0 = 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return 200ms before cap",
			); // 100 * 2^1 = 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should return 400ms before cap",
			); // 100 * 2^2 = 400
			ctx.assert.strictEqual(backoff.nextBackoff(), 500, "should cap at 500ms"); // min(500, 800) = 500
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			); // min(500, 1600) = 500
		});

		test("handles zero base delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ExponentialBackoff(0, 1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms with zero base",
			); // 0 * 2^0 = 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should remain 0ms with zero base",
			); // 0 * 2^1 = 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should remain 0ms with zero base",
			); // 0 * 2^2 = 0
		});

		test("handles base equal to cap", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ExponentialBackoff(500, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should return cap when base equals cap",
			); // min(500, 500) = 500
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			); // min(500, 1000) = 500
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			); // min(500, 2000) = 500
		});
	});

	describe("strategy reset", () => {
		test("restarts progression from base delay", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new ExponentialBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return base delay before reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should double delay before reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should continue doubling before reset",
			);

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should restart from base delay after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should double delay after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should continue doubling after reset",
			);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent state", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ExponentialBackoff(100, 10000);
			const backoff2 = new ExponentialBackoff(50, 5000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				100,
				"should return first instance base delay",
			); // 100 * 2^0
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				50,
				"should return second instance base delay",
			); // 50 * 2^0
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				200,
				"should double first instance delay",
			); // 100 * 2^1
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				100,
				"should double second instance delay",
			); // 50 * 2^1
		});
	});

	describe("parameter validation", () => {
		test("rejects non-integer base values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new ExponentialBackoff(0.5, 1000),
				RangeError,
				"should reject fractional base",
			);
			ctx.assert.throws(
				() => new ExponentialBackoff(Number.NaN, 1000),
				RangeError,
				"should reject NaN base",
			);
			ctx.assert.throws(
				() => new ExponentialBackoff(Number.POSITIVE_INFINITY, 1000),
				RangeError,
				"should reject infinite base",
			);
		});

		test("rejects negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new ExponentialBackoff(-100, 1000),
				RangeError,
				"should reject negative base",
			);
		});

		test("rejects non-integer cap values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new ExponentialBackoff(100, 0.5),
				RangeError,
				"should reject fractional cap",
			);
			ctx.assert.throws(
				() => new ExponentialBackoff(100, Number.NaN),
				RangeError,
				"should reject NaN cap",
			);
			ctx.assert.throws(
				() => new ExponentialBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
				"should reject infinite cap",
			);
		});

		test("rejects cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new ExponentialBackoff(1000, 500),
				RangeError,
				"should reject cap less than base",
			);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new ExponentialBackoff(0, 0),
				"should accept zero base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new ExponentialBackoff(100, 100),
				"should accept equal base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new ExponentialBackoff(100, 1000),
				"should accept base less than cap",
			);
			ctx.assert.doesNotThrow(
				() => new ExponentialBackoff(100, 10000),
				"should accept valid parameters",
			);
		});
	});
});
