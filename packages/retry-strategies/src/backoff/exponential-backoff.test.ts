import { describe, it, type TestContext } from "node:test";

import { ExponentialBackoff } from "./exponential-backoff.ts";

/* node:coverage disable */
describe("ExponentialBackoff - Unit tests", () => {
	describe("when calculating backoff delays", () => {
		it("should increase delay exponentially following AWS algorithm", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new ExponentialBackoff(100, 10000);

			// Act & Assert
			// delay = min(10000, 100 * 2^n)
			ctx.assert.strictEqual(backoff.nextBackoff(), 100); // 100 * 2^0 = 100
			ctx.assert.strictEqual(backoff.nextBackoff(), 200); // 100 * 2^1 = 200
			ctx.assert.strictEqual(backoff.nextBackoff(), 400); // 100 * 2^2 = 400
			ctx.assert.strictEqual(backoff.nextBackoff(), 800); // 100 * 2^3 = 800
			ctx.assert.strictEqual(backoff.nextBackoff(), 1600); // 100 * 2^4 = 1600
			ctx.assert.strictEqual(backoff.nextBackoff(), 3200); // 100 * 2^5 = 3200
		});

		it("should cap delay at maximum value", (ctx: TestContext) => {
			ctx.plan(5);

			// Arrange
			const backoff = new ExponentialBackoff(100, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 100); // 100 * 2^0 = 100
			ctx.assert.strictEqual(backoff.nextBackoff(), 200); // 100 * 2^1 = 200
			ctx.assert.strictEqual(backoff.nextBackoff(), 400); // 100 * 2^2 = 400
			ctx.assert.strictEqual(backoff.nextBackoff(), 500); // min(500, 800) = 500
			ctx.assert.strictEqual(backoff.nextBackoff(), 500); // min(500, 1600) = 500
		});

		it("should handle zero base delay", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ExponentialBackoff(0, 1000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // 0 * 2^0 = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // 0 * 2^1 = 0
			ctx.assert.strictEqual(backoff.nextBackoff(), 0); // 0 * 2^2 = 0
		});

		it("should handle base equal to cap", (ctx: TestContext) => {
			ctx.plan(3);

			// Arrange
			const backoff = new ExponentialBackoff(500, 500);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 500); // min(500, 500) = 500
			ctx.assert.strictEqual(backoff.nextBackoff(), 500); // min(500, 1000) = 500
			ctx.assert.strictEqual(backoff.nextBackoff(), 500); // min(500, 2000) = 500
		});
	});

	describe("when resetting state", () => {
		it("should restart exponential progression from base delay", (ctx: TestContext) => {
			ctx.plan(6);

			// Arrange
			const backoff = new ExponentialBackoff(100, 10000);

			// Act & Assert
			ctx.assert.strictEqual(backoff.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff.nextBackoff(), 400);

			backoff.resetBackoff();

			ctx.assert.strictEqual(backoff.nextBackoff(), 100);
			ctx.assert.strictEqual(backoff.nextBackoff(), 200);
			ctx.assert.strictEqual(backoff.nextBackoff(), 400);
		});
	});

	describe("when using with different instances", () => {
		it("should maintain independent state across instances", (ctx: TestContext) => {
			ctx.plan(4);

			// Arrange
			const backoff1 = new ExponentialBackoff(100, 10000);
			const backoff2 = new ExponentialBackoff(50, 5000);

			// Act & Assert
			ctx.assert.strictEqual(backoff1.nextBackoff(), 100); // 100 * 2^0
			ctx.assert.strictEqual(backoff2.nextBackoff(), 50); // 50 * 2^0
			ctx.assert.strictEqual(backoff1.nextBackoff(), 200); // 100 * 2^1
			ctx.assert.strictEqual(backoff2.nextBackoff(), 100); // 50 * 2^1
		});
	});

	describe("when validating constructor parameters", () => {
		it("should reject non-integer base values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new ExponentialBackoff(0.5, 1000), RangeError);
			ctx.assert.throws(
				() => new ExponentialBackoff(Number.NaN, 1000),
				RangeError,
			);
			ctx.assert.throws(
				() => new ExponentialBackoff(Number.POSITIVE_INFINITY, 1000),
				RangeError,
			);
		});

		it("should reject negative base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new ExponentialBackoff(-100, 1000), RangeError);
		});

		it("should reject non-integer cap values", (ctx: TestContext) => {
			ctx.plan(3);

			// Act & Assert
			ctx.assert.throws(() => new ExponentialBackoff(100, 0.5), RangeError);
			ctx.assert.throws(
				() => new ExponentialBackoff(100, Number.NaN),
				RangeError,
			);
			ctx.assert.throws(
				() => new ExponentialBackoff(100, Number.POSITIVE_INFINITY),
				RangeError,
			);
		});

		it("should reject cap less than base", (ctx: TestContext) => {
			ctx.plan(1);

			// Act & Assert
			ctx.assert.throws(() => new ExponentialBackoff(1000, 500), RangeError);
		});

		it("should accept valid parameter combinations", (ctx: TestContext) => {
			ctx.plan(4);

			// Act & Assert
			ctx.assert.doesNotThrow(() => new ExponentialBackoff(0, 0));
			ctx.assert.doesNotThrow(() => new ExponentialBackoff(100, 100));
			ctx.assert.doesNotThrow(() => new ExponentialBackoff(100, 1000));
			ctx.assert.doesNotThrow(() => new ExponentialBackoff(100, 10000));
		});
	});
});
