import { describe, it, type TestContext } from "node:test";

import { ConstantBackoff } from "./constant-backoff.ts";

/* node:coverage disable */
describe("ConstantBackoff - Unit tests", () => {
	describe("when calculating backoff delays", () => {
		it("should always return the configured delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ConstantBackoff(1000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 1000);
			ctx.assert.strictEqual(backoff.nextBackoff(), 1000);
			ctx.assert.strictEqual(backoff.nextBackoff(), 1000);
		});

		it("should support different delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange & Act & Assert
			const backoff100 = new ConstantBackoff(100);
			ctx.assert.strictEqual(backoff100.nextBackoff(), 100);

			const backoff500 = new ConstantBackoff(500);
			ctx.assert.strictEqual(backoff500.nextBackoff(), 500);

			const backoff0 = new ConstantBackoff(0);
			ctx.assert.strictEqual(backoff0.nextBackoff(), 0);
		});
	});

	describe("when resetting state", () => {
		it("should continue returning the same delay after reset", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff = new ConstantBackoff(1000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 1000);
			ctx.assert.strictEqual(backoff.nextBackoff(), 1000);

			backoff.resetBackoff();

			ctx.assert.strictEqual(backoff.nextBackoff(), 1000);
			ctx.assert.strictEqual(backoff.nextBackoff(), 1000);
		});
	});

	describe("when using with different instances", () => {
		it("should maintain independent configurations", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ConstantBackoff(100);
			const backoff2 = new ConstantBackoff(500);

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 500);

			backoff1.resetBackoff();

			ctx.assert.strictEqual(backoff1.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff2.nextBackoff(), 500);
		});
	});

	describe("when validating delay parameter", () => {
		it("should reject non-integer delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new ConstantBackoff(0.5), RangeError);
			ctx.assert.throws(() => new ConstantBackoff(Number.NaN), RangeError);
			ctx.assert.throws(
				() => new ConstantBackoff(Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		it("should reject negative delays", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new ConstantBackoff(-100), RangeError);
		});

		it("should accept valid delay values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.doesNotThrow(() => new ConstantBackoff(0));
			ctx.assert.doesNotThrow(() => new ConstantBackoff(100));
			ctx.assert.doesNotThrow(
				() => new ConstantBackoff(Number.MAX_SAFE_INTEGER),
			);
		});
	});
});
