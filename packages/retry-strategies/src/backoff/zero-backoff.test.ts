import { describe, it, type TestContext } from "node:test";

import { ZeroBackoff } from "./zero-backoff.ts";

/* node:coverage disable */
describe("ZeroBackoff - Unit tests", () => {
	describe("when calculating backoff delays", () => {
		it("should always return zero milliseconds", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ZeroBackoff();

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
			ctx.assert.strictEqual(backoff.nextBackoff(), 0);
		});
	});

	describe("when resetting state", () => {
		it("should continue returning zero after reset", (ctx: TestContext) => {
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

	describe("when using with different instances", () => {
		it("should maintain independent behavior", (ctx: TestContext) => {
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
