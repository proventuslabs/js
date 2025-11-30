import { describe, suite, type TestContext, test } from "node:test";

import { ConstantBackoff, constant } from "./constant-backoff.ts";

/* node:coverage disable */
suite("Constant backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("returns the same delay on every call", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ConstantBackoff(1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"should return constant delay on first call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"should return constant delay on second call",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"should return constant delay on third call",
			);
		});

		test("supports different delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange & Act & Assert
			const backoff100 = new ConstantBackoff(100);
			ctx.assert.strictEqual(
				backoff100.nextBackoff(),
				100,
				"should return 100ms delay",
			);

			const backoff500 = new ConstantBackoff(500);
			ctx.assert.strictEqual(
				backoff500.nextBackoff(),
				500,
				"should return 500ms delay",
			);

			const backoff0 = new ConstantBackoff(0);
			ctx.assert.strictEqual(
				backoff0.nextBackoff(),
				0,
				"should return 0ms delay",
			);
		});
	});

	describe("strategy reset", () => {
		test("continues returning the same delay", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new ConstantBackoff(1000);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"should return delay before reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"should return delay before reset",
			);

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"should return same delay after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				1000,
				"should return same delay after reset",
			);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent configurations", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ConstantBackoff(100);
			const backoff2 = new ConstantBackoff(500);

			// Act & Assert
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				100,
				"should return first instance delay",
			);
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				500,
				"should return second instance delay",
			);

			backoff1.resetBackoff();

			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				100,
				"should return first instance delay after reset",
			);
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				500,
				"should not affect second instance",
			);
		});
	});

	describe("parameter validation", () => {
		test("rejects NaN delay values", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new ConstantBackoff(Number.NaN),
				RangeError,
				"should reject NaN delay",
			);
		});

		test("rejects negative delays", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(
				() => new ConstantBackoff(-100),
				RangeError,
				"should reject negative delay",
			);
		});

		test("accepts fractional and special numeric values", (ctx: TestContext) => {
			ctx.plan(2);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(100.5),
				"should accept fractional values",
			);
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(Number.POSITIVE_INFINITY),
				"should accept Infinity",
			);
		});

		test("accepts valid delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(0),
				"should accept zero delay",
			);
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(100),
				"should accept positive delay",
			);
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(Number.MAX_SAFE_INTEGER),
				"should accept MAX_SAFE_INTEGER delay",
			);
		});
	});

	describe("factory function", () => {
		test("creates ConstantBackoff instance", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange & Act
			const strategy = constant(1000);

			// Assert
			ctx.assert.ok(
				strategy instanceof ConstantBackoff,
				"should return ConstantBackoff instance",
			);
			ctx.assert.strictEqual(
				strategy.nextBackoff(),
				1000,
				"should work correctly",
			);
			ctx.assert.strictEqual(
				strategy.nextBackoff(),
				1000,
				"should maintain constant delay",
			);
		});
	});
});
