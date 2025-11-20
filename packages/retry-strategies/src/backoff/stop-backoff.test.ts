import { describe, it, type TestContext } from "node:test";

import { StopBackoff } from "./stop-backoff.ts";

/* node:coverage disable */
describe("StopBackoff - Unit tests", () => {
	describe("when calculating backoff delays", () => {
		it("should always return NaN to signal no retry", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new StopBackoff();

			// Act & Assert
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
			ctx.assert.ok(Number.isNaN(backoff.nextBackoff()));
		});
	});

	describe("when resetting state", () => {
		it("should continue returning NaN after reset", (ctx: TestContext) => {
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

	describe("when using with different instances", () => {
		it("should maintain independent behavior", (ctx: TestContext) => {
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
