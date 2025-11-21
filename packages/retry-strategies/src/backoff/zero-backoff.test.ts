import { describe, suite, type TestContext, test } from "node:test";

import { ZeroBackoff } from "./zero-backoff.ts";

/* node:coverage disable */
suite("Zero backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("always returns zero milliseconds", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
		});
	});

	describe("strategy reset", () => {
		test("continues returning zero after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);

			backoff.resetBackoff();

			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent behavior", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ZeroBackoff();
			const backoff2 = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 0);

			backoff1.resetBackoff();

			ctx.assert.strictEqual(backoff1.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 0);
		});
	});
});
