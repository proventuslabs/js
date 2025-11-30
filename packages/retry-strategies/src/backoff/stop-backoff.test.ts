import { describe, suite, type TestContext, test } from "node:test";

import { StopBackoff, stop } from "./stop-backoff.ts";

/* node:coverage disable */
suite("Stop backoff strategy (Unit)", () => {
	describe("delay generation", () => {
		test("always returns NaN to signal no retry", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"should return NaN to signal no retry",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"should continue returning NaN",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"should continue returning NaN",
			);
		});
	});

	describe("strategy reset", () => {
		test("continues returning NaN after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"should return NaN before reset",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"should continue returning NaN before reset",
			);

			backoff.resetBackoff();

			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"should return NaN after reset",
			);
			ctx.assert.ok(
				Number.isNaN(backoff.nextBackoff()),
				"should continue returning NaN after reset",
			);
		});
	});

	describe("multiple instances", () => {
		test("maintains independent behavior", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new StopBackoff();
			const backoff2 = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(
				Number.isNaN(backoff1.nextBackoff()),
				"should return NaN from first instance",
			);
			ctx.assert.ok(
				Number.isNaN(backoff2.nextBackoff()),
				"should return NaN from second instance",
			);

			backoff1.resetBackoff();

			ctx.assert.ok(
				Number.isNaN(backoff1.nextBackoff()),
				"should return NaN from first instance after reset",
			);
			ctx.assert.ok(
				Number.isNaN(backoff2.nextBackoff()),
				"should not affect second instance",
			);
		});
	});

	describe("factory function", () => {
		test("creates StopBackoff instance", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange & Act
			const strategy = stop();

			// Assert
			ctx.assert.ok(
				strategy instanceof StopBackoff,
				"should return StopBackoff instance",
			);
			ctx.assert.ok(
				Number.isNaN(strategy.nextBackoff()),
				"should work correctly",
			);
			ctx.assert.ok(
				Number.isNaN(strategy.nextBackoff()),
				"should always return NaN",
			);
		});
	});
});
