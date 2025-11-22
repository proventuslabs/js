import { describe, suite, type TestContext, test } from "node:test";

import { FibonacciBackoff } from "./fibonacci-backoff.ts";

/* node:coverage disable */
suite("Fibonacci backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("increases delay following Fibonacci sequence", (ctx: TestContext) => {
			ctx.plan(8);

			// Arrange
			const backoff = new FibonacciBackoff(100, 10000);

			// Act & Assert
			// Fibonacci sequence with base 100: 100, 100, 200, 300, 500, 800, 1300, 2100...
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return 100ms on first call",
			); // F(1) * base = 1 * 100 = 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return 100ms on second call",
			); // F(2) * base = 1 * 100 = 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return 200ms on third call",
			); // F(3) * base = 2 * 100 = 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should return 300ms on fourth call",
			); // F(4) * base = 3 * 100 = 300
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should return 500ms on fifth call",
			); // F(5) * base = 5 * 100 = 500
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				800,
				"should return 800ms on sixth call",
			); // F(6) * base = 8 * 100 = 800
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1300,
				"should return 1300ms on seventh call",
			); // F(7) * base = 13 * 100 = 1300
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				2100,
				"should return 2100ms on eighth call",
			); // F(8) * base = 21 * 100 = 2100
		});

		test("caps delay at maximum value", (ctx: TestContext) => {
			ctx.plan(7);

			// Arrange
			const backoff = new FibonacciBackoff(100, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return 100ms before cap",
			); // 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return 100ms before cap",
			); // 100
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should return 200ms before cap",
			); // 200
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should return 300ms before cap",
			); // 300
			ctx.assert.strictEqual(backoff.nextBackoff(), 500, "should cap at 500ms"); // min(500, 500) = 500
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			); // min(500, 800) = 500
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			); // min(500, 1300) = 500
		});

		test("handles zero base delay", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new FibonacciBackoff(0, 1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms with zero base",
			); // 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should remain 0ms with zero base",
			); // 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should remain 0ms with zero base",
			); // 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should remain 0ms with zero base",
			); // 0
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should remain 0ms with zero base",
			); // 0
		});

		test("handles base equal to cap", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new FibonacciBackoff(500, 500);

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
			); // min(500, 1500) = 500
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain at cap",
			); // min(500, 2500) = 500
		});
	});

	describe("strategy reset", () => {
		test("restarts progression from base delay", (ctx: TestContext) => {
			ctx.plan(8);

			// Arrange
			const backoff = new FibonacciBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return base delay before reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should return base delay before reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should continue sequence before reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should continue sequence before reset",
			);

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should restart from base delay after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should restart from base delay after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should continue sequence after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should continue sequence after reset",
			);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent state", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff1 = new FibonacciBackoff(100, 10000);
			const backoff2 = new FibonacciBackoff(50, 5000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				100,
				"should return first instance base delay",
			); // 100
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				50,
				"should return second instance base delay",
			); // 50
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				100,
				"should continue first instance sequence",
			); // 100
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				50,
				"should continue second instance sequence",
			); // 50
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				200,
				"should continue first instance sequence",
			); // 200
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				100,
				"should continue second instance sequence",
			); // 100
		});
	});

	describe("parameter validation", () => {
		test("rejects non-integer base values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new FibonacciBackoff(0.5, 1000),
				RangeError,
				"should reject fractional base",
			);
			ctx.assert.throws(
				() => new FibonacciBackoff(Number.NaN, 1000),
				RangeError,
				"should reject NaN base",
			);
			ctx.assert.throws(
				() => new FibonacciBackoff(Number.POSITIVE_INFINITY, 1000),
				RangeError,
				"should reject infinite base",
			);
		});

		test("rejects negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new FibonacciBackoff(-100, 1000),
				RangeError,
				"should reject negative base",
			);
		});

		test("rejects non-integer cap values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new FibonacciBackoff(100, 0.5),
				RangeError,
				"should reject fractional cap",
			);
			ctx.assert.throws(
				() => new FibonacciBackoff(100, Number.NaN),
				RangeError,
				"should reject NaN cap",
			);
			ctx.assert.throws(
				() => new FibonacciBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
				"should reject infinite cap",
			);
		});

		test("rejects cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new FibonacciBackoff(1000, 500),
				RangeError,
				"should reject cap less than base",
			);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new FibonacciBackoff(0, 0),
				"should accept zero base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new FibonacciBackoff(100, 100),
				"should accept equal base and cap",
			);
			ctx.assert.doesNotThrow(
				() => new FibonacciBackoff(100, 1000),
				"should accept base less than cap",
			);
			ctx.assert.doesNotThrow(
				() => new FibonacciBackoff(100, 10000),
				"should accept valid parameters",
			);
		});
	});
});
