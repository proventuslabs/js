import { describe, suite, type TestContext, test } from "node:test";

import { LinearBackoff } from "./linear-backoff.ts";

/* node:coverage disable */
suite("Linear backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("increases delay linearly with default initial delay", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new LinearBackoff(100);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should start at 0ms with default initial delay",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should increase by 100ms",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should increase by 100ms",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should increase by 100ms",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should increase by 100ms",
			);
		});

		test("increases delay linearly with custom initial delay", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new LinearBackoff(50, 100);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				100,
				"should start at custom initial delay",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				150,
				"should increase by 50ms",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should increase by 50ms",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				250,
				"should increase by 50ms",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should increase by 50ms",
			);
		});

		test("behaves like constant backoff with zero increment", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new LinearBackoff(0, 500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should return constant delay with zero increment",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain constant",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				500,
				"should remain constant",
			);
		});
	});

	describe("strategy reset", () => {
		test("restarts progression from initial delay", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new LinearBackoff(100, 200);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should start at initial delay",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should increase linearly",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should continue increasing",
			);

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				200,
				"should restart from initial delay after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				300,
				"should increase linearly after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				400,
				"should continue increasing after reset",
			);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent state", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new LinearBackoff(100);
			const backoff2 = new LinearBackoff(50, 200);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				0,
				"should return first instance initial delay",
			);
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				200,
				"should return second instance initial delay",
			);
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				100,
				"should increase first instance",
			);
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				250,
				"should increase second instance",
			);
		});
	});

	describe("parameter validation", () => {
		test("rejects non-integer increment values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new LinearBackoff(0.5),
				RangeError,
				"should reject fractional increment",
			);
			ctx.assert.throws(
				() => new LinearBackoff(Number.NaN),
				RangeError,
				"should reject NaN increment",
			);
			ctx.assert.throws(
				() => new LinearBackoff(Number.POSITIVE_INFINITY),
				RangeError,
				"should reject infinite increment",
			);
		});

		test("rejects negative increment", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new LinearBackoff(-100),
				RangeError,
				"should reject negative increment",
			);
		});

		test("rejects non-integer initial delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(
				() => new LinearBackoff(100, 0.5),
				RangeError,
				"should reject fractional initial delay",
			);
			ctx.assert.throws(
				() => new LinearBackoff(100, Number.NaN),
				RangeError,
				"should reject NaN initial delay",
			);
			ctx.assert.throws(
				() => new LinearBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
				"should reject infinite initial delay",
			);
		});

		test("rejects negative initial delay", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new LinearBackoff(100, -50),
				RangeError,
				"should reject negative initial delay",
			);
		});

		test("accepts valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new LinearBackoff(0),
				"should accept zero increment",
			);
			ctx.assert.doesNotThrow(
				() => new LinearBackoff(100),
				"should accept positive increment",
			);
			ctx.assert.doesNotThrow(
				() => new LinearBackoff(100, 0),
				"should accept zero initial delay",
			);
			ctx.assert.doesNotThrow(
				() => new LinearBackoff(100, 200),
				"should accept valid parameters",
			);
		});
	});
});
