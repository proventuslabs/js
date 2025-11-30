import { describe, suite, type TestContext, test } from "node:test";

import { ZeroBackoff, zero } from "./zero-backoff.ts";

/* node:coverage disable */
suite("Zero backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("always returns zero milliseconds", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms delay",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should continue returning 0ms",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should continue returning 0ms",
			);
		});
	});

	describe("strategy reset", () => {
		test("continues returning zero after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms before reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should continue returning 0ms before reset",
			);

			backoff.resetBackoff();

			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should return 0ms after reset",
			);
			ctx.assert.strictEqual(
				backoff.nextBackoff(),
				0,
				"should continue returning 0ms after reset",
			);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent behavior", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ZeroBackoff();
			const backoff2 = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				0,
				"should return 0ms from first instance",
			);
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				0,
				"should return 0ms from second instance",
			);

			backoff1.resetBackoff();

			ctx.assert.strictEqual(
				backoff1.nextBackoff(),
				0,
				"should return 0ms from first instance after reset",
			);
			ctx.assert.strictEqual(
				backoff2.nextBackoff(),
				0,
				"should not affect second instance",
			);
		});
	});

	describe("factory function", () => {
		test("creates ZeroBackoff instance", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange & Act
			const strategy = zero();

			// Assert
			ctx.assert.ok(
				strategy instanceof ZeroBackoff,
				"should return ZeroBackoff instance",
			);
			ctx.assert.strictEqual(
				strategy.nextBackoff(),
				0,
				"should work correctly",
			);
			ctx.assert.strictEqual(
				strategy.nextBackoff(),
				0,
				"should always return zero",
			);
		});
	});
});
