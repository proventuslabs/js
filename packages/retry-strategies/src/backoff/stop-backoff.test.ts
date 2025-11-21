import { describe, suite, type TestContext, test } from "node:test";

import { StopBackoff } from "./stop-backoff.ts";

/* node:coverage disable */
suite("Stop backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("always returns NaN to signal no retry", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
		});
	});

	describe("strategy reset", () => {
		test("continues returning NaN after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));

			backoff.resetBackoff();

			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
		});
	});

	describe("multiple instances", () => {
		test("maintains independent behavior", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new StopBackoff();
			const backoff2 = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(Number.isNaN(backoff1.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff2.nextBackoff()));

			backoff1.resetBackoff();

			ctx.assert.ok(Number.isNaN(backoff1.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff2.nextBackoff()));
		});
	});
});
